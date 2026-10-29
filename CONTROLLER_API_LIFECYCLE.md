# VONG DOI CONTROLLER API - CHI TIET DAY DU (Controller -> Service -> Database)

Ky hieu:
	OK  = Validate thanh cong
	ERR = Validate that bai / throw error
	->> = Phan nhanh (if/else)
	DB  = DB Query (Sequelize)
	EM  = Gui email / notification (async)
	TX  = Transaction (BEGIN / COMMIT / ROLLBACK)

==============================================================================
## 1. ADDRESS MODULE
==============================================================================
File: address.controller.js | Service: address.service.js

### getMyAddresses
	INPUT:  req.user.id
	SERVICE: addressService.getMyAddresses(userId)
		DB  db.UserAddress.findAll({ where:{user_id}, order:[['is_default','DESC']] })
		    -> map formatAddress() -> return list
	RESPONSE: 200 / 500

### createAddress
	INPUT:  req.user.id, req.body { recipient_name, phone_number, address_line, is_default }
	SERVICE: addressService.createAddress(userId, body)
		TX  BEGIN TRANSACTION
		->> if is_default==true:
			DB  db.UserAddress.update({is_default:false}, {where:{user_id}}) -> reset cu
		->> else:
			DB  db.UserAddress.count({where:{user_id}})
			    -> if count==0: tu dat is_default=true
		    -> parseAddress(address_line) -> {province,district,ward,street}
		DB  db.UserAddress.create({user_id,receiver_name,phone,province,district,ward,street,is_default})
		TX  COMMIT
		ERR ROLLBACK neu loi
	RESPONSE: 201 / 500

### updateAddress
	INPUT:  req.user.id, req.params.id, req.body { recipient_name, phone_number, address_line, is_default }
	SERVICE: addressService.updateAddress(id, userId, body)
		TX  BEGIN TRANSACTION
		DB  db.UserAddress.findOne({where:{id,user_id}})
		ERR if !address -> throw 'Address not found'
		->> if is_default==true AND address.is_default==false:
			DB  db.UserAddress.update({is_default:false},{where:{user_id}})
		    -> build updateData (chi field co trong body)
		    -> if address_line: parseAddress() -> cap nhat province/district/ward/street
		DB  address.update(updateData)
		TX  COMMIT
		ERR ROLLBACK neu loi
	RESPONSE: 200 / 404 / 500

### deleteAddress
	INPUT:  req.user.id, req.params.id
	SERVICE: addressService.deleteAddress(id, userId)
		DB  db.UserAddress.findOne({where:{id,user_id}})
		ERR if !address -> throw 'Address not found'
		    wasDefault = address.is_default
		DB  address.destroy()
		->> if wasDefault==true:
			DB  db.UserAddress.findOne({where:{user_id}}) -> tim dia chi ke tiep
			    -> if tim thay: anotherAddress.is_default=true; save()
	RESPONSE: 200 / 404 / 500

==============================================================================
## 2. AUTH MODULE
==============================================================================
File: auth.controller.js | Service: auth.service.js | Util: jwt.js, emailService.js

### register
	INPUT:  req.body { email, phone, password, fullName, role_id }
	SERVICE: authService.register(data)
		DB  db.User.findOne({where:{OR:[{email},{phone}]}, paranoid:false})
		->> if existingUser:
			ERR if deleted_at -> resolve 409 'Tai khoan da bi xoa'
			ERR else -> resolve 409 'User with this email or phone already exists'
		    -> bcrypt.hash(password, 10)
		    -> crypto.randomInt(100000,999999) -> otpCode; expiredAt = now+15min
		    -> pendingRegistrations.set(email, {email,phone,hash,fullName,role_id,otpCode,expiredAt})
		       [LUU IN-MEMORY - chua vao DB]
		EM  sendRegistrationOtp(email, otpCode) [fire-and-forget]
		OK  resolve 201 { message, data:{email} }
	RESPONSE: 201 / 409 / 500

### verifyAccountOtp
	INPUT:  req.body { email, otpCode }
	SERVICE: authService.verifyAccountOtp(data)
		    -> pendingRegistrations.get(email)
		ERR if !pendingUser -> resolve 404 'User not found or registration expired'
		ERR if otpCode !== pendingUser.otpCode -> resolve 400 'Invalid OTP code'
		ERR if Date.now() > expiredAt -> delete(email) -> resolve 410 'OTP expired'
		OK  OTP hop le:
			DB  db.User.create({email,phone,password(hashed),role_id,status:'ACTIVE'})
			DB  db.UserProfile.create({user_id,full_name})
			    -> pendingRegistrations.delete(email)
		    -> resolve 200 'Account verified and created successfully'
	RESPONSE: 200 / 400 / 404 / 410

### login
	INPUT:  req.body { email_or_phone, password }
	SERVICE: authService.login(data)
		DB  db.User.findOne({where:{OR:[{email},{phone}]}, include:[Role,UserProfile]})
		ERR if !user -> resolve 401 'User not found'
		    -> bcrypt.compare(password, user.password)
		ERR if !isMatch -> resolve 401 'Wrong password'
		ERR if user.status !== 'ACTIVE' -> resolve 403 'Account is not active'
		OK  Tao tokens:
			    -> generateAccessToken({id,email,role_id}) -> JWT accessToken (secret, expiry)
			    -> generateRefreshToken({id}) -> JWT refreshToken
			DB  db.RefreshToken.create({user_id,token:refreshToken,expires_at:now+7days,is_revoked:false})
		->> if role_id===1 OR role_name==='admin' -> redirectUrl='/admin'
		    -> resolve 200 {accessToken,refreshToken,redirectUrl,user}
	RESPONSE: 200 {data:{accessToken,refreshToken,redirectUrl,user}} / 401 / 403

### refreshToken
	INPUT:  req.body { refreshToken }
	SERVICE: authService.refreshToken(token)
		DB  db.RefreshToken.findOne({where:{token,is_revoked:false}})
		ERR if !record -> resolve 401 'Invalid refresh token'
		ERR if now > record.expires_at -> resolve 401 'Refresh token expired'
		DB  refreshTokenRecord.update({is_revoked:true}) -> revoke cu
		DB  db.User.findByPk(refreshTokenRecord.user_id)
		ERR if !user -> resolve 404 'User not found'
		    -> generateAccessToken / generateRefreshToken
		DB  db.RefreshToken.create({user_id,token:newRefreshToken,expires_at:now+7days})
		    -> resolve 200 {accessToken, refreshToken}
	RESPONSE: 200 / 401

### googleLogin
	INPUT:  req.body { access_token } (Google OAuth)
	SERVICE: authService.googleLogin(accessToken)
		    -> axios.GET('https://www.googleapis.com/oauth2/v3/userinfo', Bearer token)
		    -> lay {email, sub, given_name, family_name, picture}
		DB  db.User.findOne({where:{email}, include:[Role]})
		->> if user ton tai:
			->> if auth_provider=='local' hoac null:
				DB  user.update({auth_provider:'google', auth_provider_id:sub})
			DB  db.UserProfile.findOne({where:{user_id}})
			->> if profile && !avatar_url:
				DB  profile.update({avatar_url:picture})
		->> else (user moi):
			DB  db.User.create({email,auth_provider:'google',sub,status:'ACTIVE',role_id:5})
			DB  db.UserProfile.create({user_id,full_name,avatar_url:picture})
			DB  db.User.findByPk(user.id,{include:[Role]}) -> reload
		ERR if user.status !== 'ACTIVE' -> resolve 403
		    -> generateAccessToken / generateRefreshToken
		DB  db.RefreshToken.create({...})
		    -> resolve 200 {accessToken,refreshToken,redirectUrl,user}
	RESPONSE: 200 / 403 / 500

### logout
	INPUT:  req.body { refreshToken }
	CONTROLLER inline:
		DB  db.RefreshToken.update({is_revoked:true},{where:{token}})
	RESPONSE: 200

==============================================================================
## 3. FORGOT PASSWORD MODULE
==============================================================================
File: forgotPassword.controller.js | Service: forgotPassword.service.js
Constants: OTP_EXPIRY=5min, MAX_ATTEMPTS=3, LOCK=15min, MIN_PWD_LEN=8
PASSWORD_POLICY: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&...]).{8,}$/

### sendOtp
	INPUT:  req.body { email }
	SERVICE: forgotPasswordService.sendOtp(email)
		DB  db.User.findOne({where:{email}})
		ERR if !user -> resolve 404 'Email does not exist'
		DB  db.OtpVerification.destroy({where:{user_id,type:'PASSWORD_RECOVERY',is_used:false}})
		    -> crypto.randomInt(100000,999999) -> otpCode; expiredAt=now+5min
		DB  db.OtpVerification.create({user_id,otp_code,type:'PASSWORD_RECOVERY',expired_at,attempts:0,is_used:false,locked_until:null})
		EM  sendForgotPasswordOtp(email, otpCode) [fire-and-forget]
		    -> resolve 200 'OTP has been sent'
	RESPONSE: 200 / 404 / 500

### verifyOtp
	INPUT:  req.body { email, otpCode }
	SERVICE: forgotPasswordService.verifyOtp(email, otpCode)
		DB  db.User.findOne({where:{email}})
		ERR if !user -> 404
		DB  db.OtpVerification.findOne({where:{user_id,type:'PASSWORD_RECOVERY',is_used:false}, order:[['created_at','DESC']]})
		ERR if !otpRecord -> 400 'No active OTP found'
		ERR if locked_until && now < locked_until -> 423 'OTP locked X min'
		ERR if now > expired_at -> 410 'OTP expired'
		->> if otp_code !== otpCode:
			    newAttempts = attempts + 1
			->> if newAttempts >= 3:
				DB  otpRecord.update({attempts:newAttempts, locked_until:now+15min})
				EM  sendOtpSecurityAlert(email) [fire-and-forget]
				    -> resolve 423 'Locked for 15 minutes'
			DB  otpRecord.update({attempts:newAttempts})
			    -> resolve 400 'Invalid OTP. X attempt(s) remaining'
		OK  OTP dung:
			DB  otpRecord.update({is_used:true})
			    -> resetToken = base64url(userId:timestamp:hmac_sha256_sig)
			    -> resolve 200 {reset_token}
	RESPONSE: 200 {data:{reset_token}} / 400 / 404 / 410 / 423

### resetPassword
	INPUT:  req.body { resetToken, newPassword, confirmPassword }
	SERVICE: forgotPasswordService.resetPassword(resetToken, newPwd, confirmPwd)
		    -> base64url decode -> tach [userId, timestamp, signature]
		ERR if malformed/invalid sig -> 400 'Invalid or tampered token'
		ERR if now-timestamp > 10min -> 410 'Token expired'
		ERR if newPassword.length < 8 -> 400 'Min 8 characters'
		ERR if !PASSWORD_POLICY_REGEX.test(newPwd) -> 400 'Can uppercase,lowercase,so,ky tu dac biet'
		ERR if newPwd !== confirmPwd -> 400 'Passwords do not match'
		DB  db.User.findByPk(userId)
		ERR if !user -> 404
		    -> bcrypt.hash(newPassword, 10)
		DB  user.update({password:hashedPassword})
		DB  db.RefreshToken.destroy({where:{user_id}}) -> revoke tat ca session cu
		    -> resolve 200 'Password changed successfully'
	RESPONSE: 200 / 400 / 404 / 410 / 500

### resendOtp
	-> Goi lai sendOtp(email) -- xu ly giong het

==============================================================================
## 4. CART MODULE
==============================================================================
File: cart.controller.js | Service: cart.service.js

### getCart
	INPUT:  req.user.id
	SERVICE: cartService.getCartByUserId(userId)
		DB  db.CartItem.findAll({
		      where:{user_id},
		      include:[ProductVariant->Product->ProductImage(is_primary),Shop,variants],
		      order:[['added_at','DESC']]
		    })
		    -> filter: chi giu item co variant && product && approval_status==='APPROVED'
		    -> totalItems = sum(quantity)
		    -> totalAmount = sum(qty * (sale_price || price))
		-> return {user_id, items, totalItems, totalAmount}
	RESPONSE: 200 {data:cartData} / 500

### addItemToCart
	INPUT:  req.user.id, req.body { variantId, quantity }
	SERVICE: cartService.addItemToCart(userId, {variantId, quantity})
		DB  db.ProductVariant.findByPk(variantId, {include:[Product]})
		ERR if !variant || !product || approval_status!=='APPROVED' -> throw 'San pham khong ton tai'
		ERR if variant.stock_quantity < quantity -> throw 'Chi con X san pham'
		DB  db.CartItem.findOne({where:{user_id, variant_id:variantId}})
		->> if existingItem:
			    newQty = existingItem.quantity + quantity
			ERR if newQty > stock_quantity -> throw 'Vuot ton kho'
			DB  existingItem.update({quantity:newQty})
		->> else:
			DB  db.CartItem.create({user_id, variant_id, quantity})
	RESPONSE: 200 / 400 / 500

### updateCartItem
	INPUT:  req.user.id, req.params.id, req.body { quantity?, newVariantId? }
	SERVICE: cartService.updateCartItem(userId, itemId, quantity, newVariantId)
		DB  db.CartItem.findOne({where:{id:itemId,user_id}, include:[ProductVariant]})
		ERR if !item -> throw 'San pham khong co trong gio'
		->> if quantity !== undefined && quantity <= 0:
			DB  item.destroy() -> return {removed:true}
		->> if newVariantId !== undefined && newVariantId !== item.variant_id:
			DB  db.ProductVariant.findByPk(newVariantId)
			ERR if !newVariant || newVariant.product_id !== item.variant.product_id -> throw 'Bien the khong hop le'
			DB  db.CartItem.findOne({where:{user_id,variant_id:newVariantId,id:{ne:item.id}}})
			->> if existingItem:
				    gop so luong, kiem tra ton kho
				DB  existingItem.update({quantity:merged})
				DB  item.destroy()
			->> else: updates.variant_id = newVariantId
		DB  item.update(updates) neu co thay doi
	RESPONSE: 200 / 400 / 500

### removeCartItem
	INPUT:  req.user.id, req.params.id
	SERVICE: cartService.removeCartItem(userId, itemId)
		DB  db.CartItem.findOne({where:{id:itemId,user_id}})
		ERR if !item -> throw 'San pham khong co trong gio'
		DB  item.destroy()
	RESPONSE: 200 / 500

==============================================================================
## 5. ORDER MODULE
==============================================================================
File: order.controller.js | Service: order.service.js
Imports: cart.service, notification.service, shipment.service (lazy)

### calculateCheckout
	INPUT:  req.user.id, req.body { items?, platformCouponCode?, shopCoupons?:{shopId:code}, usePoints? }
	SERVICE: orderService.calculateCheckout(userId, data)
		DB  db.SystemSetting.findOne({setting_key:'LOYALTY_POINT_EARN_RATE'}) -> earnRate
		DB  db.SystemSetting.findOne({setting_key:'LOYALTY_POINT_REDEEM_RATE'}) -> redeemRate
		->> if items empty -> lay gio hang:
			    cartService.getCartByUserId(userId)
			ERR if cart rong -> throw 'Gio hang trong'
		[VONG LAP tung item - nhom theo shop]
			DB  db.Product.findByPk(product_id, {include:[Shop]})
			ERR if !product || status!=='APPROVED' -> throw 'San pham khong hop le'
			DB  db.ProductVariant.findByPk(variant_id) hoac findOne({product_id})
			ERR if !variant -> throw 'Bien the khong hop le'
			    -> group by shop_id: subtotal+=qty*price; shipping_fee=30000(fixed)
		[AP DUNG COUPON SHOP - shopCoupons = {shopId: code}]
			DB  db.Coupon.findOne({where:{code,shop_id}})
			ERR if coupon.used_count >= usage_limit -> throw 'Ma da het luot'
			DB  db.UserCoupon.findOne({where:{user_id,coupon_id,is_used:false}})
			ERR if !isSaved -> throw 'Ban chua luu ma giam gia'
			->> if coupon.category_id:
				    getDescendantCategories(categoryId):
					    [de quy] db.Category.findAll({where:{parent_id IN ids}})
				    -> validSubtotal chi tinh san pham thuoc danh muc
			ERR if validSubtotal < min_order_amount -> throw 'Don chua du dieu kien'
			    -> discount = PERCENT:subtotal*rate/100 | FIXED:value
			    -> cap tai max_discount neu co
		[AP DUNG PLATFORM COUPON - shop_id===null]
			DB  db.Coupon.findOne({where:{code,shop_id:null}})
			    -> validate tuong tu coupon shop
		[AP DUNG DIEM TICH LUY]
		->> if usePoints:
			DB  db.User.findByPk(userId) -> user.loyalty_points
			    -> pointsDiscount = loyalty_points * redeemRate
			    -> cap tai remainingTotal
		[KIEM TRA COD BLOCK - bom hang]
			DB  db.ShopOrderStatusHistory.count({
			      where:{note LIKE 'BOM:%', changed_at >= now-30days},
			      include:[ShopOrder->ParentOrder{user_id}]
			    })
			    -> isCodBlocked = bomCount >= 3
		-> return {shops[], parentSubtotal, totalShippingFee, totalShopDiscount,
		            platformDiscount, pointsDiscount, totalAmount, isCodBlocked, earnRate, redeemRate}
	RESPONSE: 200 {data:checkoutSummary} / 400 / 500

### createOrder
	INPUT:  req.user.id, req.body { paymentMethod, addressId, platformCouponCode, shopCoupons,
	          items, usePoints, note, is_cart_checkout }
	SERVICE: orderService.createOrder(userId, data)
		    -> calculateCheckout(userId, ...) [goi lai toan bo logic tinh tien]
		ERR if paymentMethod==='COD' && isCodBlocked -> throw 'COD bi khoa do bom hang'
		DB  db.UserAddress.findByPk(addressId)
		ERR if !address -> throw 'Dia chi khong hop le'
		TX  BEGIN TRANSACTION
		DB  db.ParentOrder.create({user_id, address_id, checkout_code:'CHK-YYYYMMDD-XXXXX',
		      total_amount, payment_method, payment_status:'UNPAID',
		      shipping_address, platform_coupon_id, note})
		    -> totalPointsToUse = ceil(pointsDiscount / redeemRate)
		DB  db.User.decrement('loyalty_points',{by:totalPointsToUse,where:{id:userId}}) [neu dung diem]
		[VONG LAP tung shop]
			DB  db.PlatformCommission.findOne({where:{shop_id}}) -> commissionRate (default 10%)
			    -> commissionBase = subtotal - shopDiscount
			    -> commissionAmount = commissionBase * rate / 100
			    -> shopGlobalDiscount phan bo theo ty le final_amount
			    -> finalAmountAfterGlobal = final_amount - shopGlobalDiscount
			DB  db.ShopOrder.create({parent_order_id, shop_id, shop_order_code:'SHOP-...',
			      subtotal, shipping_fee, discount_amount, final_amount:finalAmountAfterGlobal,
			      commission_rate, commission_amount, shop_coupon_id,
			      points_used, points_earned, status:'PENDING'})
			DB  db.OrderItem.bulkCreate([{shop_order_id,variant_id,product_name,sku,size,color,quantity,unit_price}])
			DB  db.ShopOrderStatusHistory.create({shop_order_id,new_status:'PENDING',note:'Don hang moi'})
			DB  db.Shop.findByPk(shop_id) -> lay vendor_id
			EM  notificationService.createNotification(vendor_id, 'Don hang moi cho xu ly', ...)
			[VONG LAP tung item - tru ton kho]
				DB  db.ProductVariant.decrement('stock_quantity',{by:qty,where:{id:variant_id}})
		->> if is_cart_checkout:
			DB  db.CartItem.destroy({where:{id:cartItemIds,user_id}})
		DB  db.PaymentLog.create({order_code,gateway_name:paymentMethod,amount,status:'UNPAID'})
		[CAP NHAT COUPON]
			DB  db.Coupon.increment('used_count',{by:1,where:{id IN appliedCouponIds}})
			DB  db.UserCoupon.update({is_used:true,used_at:now},
			      {where:{user_id,coupon_id IN appliedCouponIds,is_used:false}})
		TX  COMMIT
		EM  notificationService.createNotification(userId, 'Dat hang thanh cong', ...)
		    -> return parentOrder
		ERR ROLLBACK neu loi
	RESPONSE: 201 {data:parentOrder} / 400 / 500

### getUserOrders
	INPUT:  req.user.id, req.query { page, limit, status }
	SERVICE: orderService.getUserOrders(userId, {page,limit,status})
		DB  db.ParentOrder.findAll({where:{user_id},attributes:['id']})
		    -> parentIds = [...]
		DB  db.ShopOrder.findAndCountAll({
		      where:{parent_order_id IN parentIds, status?},
		      include:[OrderItem->ProductVariant->Product->ProductImage,Shop,ParentOrder],
		      order:[['created_at','DESC']], limit, offset, distinct:true
		    })
		[VONG LAP - tu dong huy don VNPay qua 24h chua thanh toan]
		->> if paymentMethod==='VNPAY' && payment_status==='UNPAID' && status!=='CANCELLED':
			    hoursDiff = (now - created_at) / 3600000
			->> if hoursDiff > 24:
				DB  shopOrder.update({status:'CANCELLED'})
				DB  db.User.increment('loyalty_points',{by:points_used}) [neu co]
				[loop] DB db.ProductVariant.increment('stock_quantity',{by:qty}) -> hoan kho
		-> return {total, totalPages, currentPage, orders}
	RESPONSE: 200 {data} / 500

### updateOrderStatus
	INPUT:  req.user.id, req.params.id (shopOrderId), req.body { status, note }
	SERVICE: orderService.updateOrderStatus(shopOrderId, userId, newStatus, role, note)
		DB  db.ShopOrder.findByPk(shopOrderId, {include:[ParentOrder,OrderItem]})
		ERR if !shopOrder -> throw 'Khong tim thay don hang'
		[PHAN QUYEN THEO ROLE]
		->> if role==='vendor':
			DB  db.Shop.findOne({where:{vendor_id:userId}})
			ERR if !shop || shop.id!==shopOrder.shop_id -> throw 'Khong co quyen'
			ERR if PREPARING && VNPAY && UNPAID -> throw 'Chua thanh toan'
		->> if role==='user':
			ERR if parentOrder.user_id !== userId -> throw 'Khong co quyen'
		->> if role==='shipper':
			ERR throw 'Shipper phai dung tinh nang Van don'
		[PHAN LUONG THEO TRANG THAI MOI]
		->> if newStatus==='PREPARING' (lan dau):
			    autoAssignShipperByArea(shopOrderId):
				DB  db.User.findAll({where:{status:'ACTIVE'}, include:[Role{shipper},UserProfile]})
				DB  db.ShopOrder.findAll({where:{shipper_id IN ids,status:['SHIPPING','RETURN_PENDING']}})
				    -> matching: shipper co operating_areas INCLUDES dia chi giao hang
				    -> sort matched: nhieu don cung area, it tong workload -> uu tien
				    -> fallback: shipper it don nhat
				    -> return selectedShipperId
			    -> updateData.shipper_id = selectedShipperId
			    shipmentService.createShipment(shopOrderId, shipperId):
				DB  db.Shipment.create({shop_order_id,shipper_id,tracking_number,status:'PENDING_PICKUP',shipping_fee:30000})
				DB  db.ShipmentHistory.create({shipment_id,status:'PENDING_PICKUP',note:'Cho shipper lay'})
		->> if newStatus==='DELIVERED' (lan dau):
			    updateData.delivered_at = now
			->> if payment_method==='COD':
				    updateData.cod_amount_collected = final_amount
				    updateData.cod_status = 'HELD_BY_SHIPPER'
				DB  parentOrder.update({payment_status:'PAID'})
			DB  db.SystemSetting.findAll({where:{setting_key:['tax_rate','payment_gateway_fee']}})
			    -> taxRate, gatewayFeeRate (from DB settings)
			    -> netEarning = (subtotal-discount) - commission - tax - gatewayFee
			DB  db.ShopWallet.findOrCreate({where:{shop_id},defaults:{balance:0,pending:0,total:0}})
			DB  wallet.increment('pending_balance',{by:netEarning})
		->> if newStatus==='COMPLETED' (lan dau):
			    netEarning = (subtotal-discount) - commission - tax - gatewayFee
			DB  wallet.update({pending_balance-=deduct, balance+=netEarning, total_earned+=netEarning})
			->> if COD && payment_status!=='PAID':
				DB  parentOrder.update({payment_status:'PAID'})
			DB  db.User.increment('loyalty_points',{by:points_earned,where:{id:customer_id}})
		DB  shopOrder.update(updateData)
		[XU LY HUY / THAT BAI]
		->> if CANCELLED hoac FAILED (lan dau):
			DB  db.User.increment('loyalty_points',{by:points_used}) -> hoan diem da dung
			->> if CANCELLED && payment_method!=='COD':
				DB  db.SystemSetting.findOne('LOYALTY_POINT_REDEEM_RATE')
				    -> pointsToRefund = floor(final_amount / redeemRate)
				DB  db.User.increment('loyalty_points',{by:pointsToRefund})
				DB  db.ParentOrder.update({payment_status:'REFUNDED'})
		[HOAN KHO]
		->> if CANCELLED hoac RETURNED (lan dau):
			->> if RETURNED -> tim ReturnRequest APPROVED:
				    returnService._processRestockOnly(returnRequest) -> hoan kho dung qty
				    returnService._processRefundOnly(returnRequest) -> hoan tien/diem
				DB  returnRequest.update({status:'COMPLETED'})
				DB  db.ParentOrder.update({payment_status:'REFUNDED'})
			->> else -> hoan toan bo kho:
				[loop] DB db.ProductVariant.increment('stock_quantity',{by:qty,paranoid:false})
		DB  db.ShopOrderStatusHistory.create({shop_order_id,old_status,new_status,changed_by,note})
		[GUI THONG BAO 4 ben: nguoi thuc hien, vendor, customer, shipper]
		EM  notificationService.createNotification(userId, actorTitle, actorContent, 'ORDER_UPDATE')
		EM  notificationService.createNotification(vendorId, ...) [neu khac actor]
		EM  notificationService.createNotification(customerId, ...) [neu khac actor]
		EM  notificationService.createNotification(shipperId, ...) [neu khac actor]
	RESPONSE: 200 / 400 / 403 / 404 / 500

### cancelOrder
	INPUT:  req.user.id, req.params.id, req.body { reason }
	SERVICE: orderService.cancelOrder(shopOrderId, userId, reason)
		DB  db.ShopOrder.findByPk(shopOrderId,{include:[ParentOrder]})
		ERR if !shopOrder -> throw 'Khong tim thay'
		ERR if parentOrder.user_id !== userId -> throw 'Khong co quyen'
		->> if status==='PREPARING' -> newStatus='CANCEL_REQUESTED' [cho shop xac nhan]
		->> else -> newStatus='CANCELLED' [huy ngay]
		DB  shopOrder.update({status:newStatus})
		->> if CANCELLED:
			DB  db.User.increment('loyalty_points',{by:points_used}) -> hoan diem
			[loop] DB db.ProductVariant.increment('stock_quantity') -> hoan kho
			->> if payment_method!=='COD':
				    pointsToRefund = floor(final_amount / redeemRate)
				DB  db.User.increment('loyalty_points',{by:pointsToRefund})
				DB  db.ParentOrder.update({payment_status:'REFUNDED'})
		DB  db.ShopOrderStatusHistory.create({...})
		EM  notificationService -> user
		EM  notificationService -> vendor
	RESPONSE: 200 / 400 / 500

### getOrderDetail
	INPUT:  req.user.id, req.params.id (shopOrderId)
	SERVICE: orderService.getOrderDetail(shopOrderId, userId)
		DB  db.ShopOrder.findOne({where:{id},
		      include:[OrderItem->Variant->Product->Image,Shop,ParentOrder,ProductReview,ReturnRequest]})
		ERR if !shopOrder -> throw 'Khong tim thay'
		ERR if parentOrder.user_id !== userId -> throw 'Khong co quyen'
		[Tu dong huy VNPay qua 24h - logic giong getUserOrders]
	RESPONSE: 200 {data:shopOrder} / 403 / 404 / 500

==============================================================================
## 6. PAYMENT MODULE
==============================================================================
File: payment.controller.js | Service: vnpay.service.js

### createVnpayPayment
	INPUT:  req.user.id, req.body { orderCode, amount }, req.ip
	CONTROLLER:
		DB  db.ParentOrder.findOne({where:{checkout_code:orderCode,user_id}})
		ERR if !order -> 404 'Order not found'
		ERR if order.payment_status==='PAID' -> 400 'Already paid'
		    vnpayService.createPaymentUrl(ip, orderCode, amount, orderInfo):
			    -> build vnp_Params: TmnCode, Version='2.1.0', Command='pay',
			       Locale='vn', CurrCode='VND', TxnRef=orderCode,
			       Amount=amount*100, ReturnUrl, IpAddr, CreateDate(YYYYMMDDHHmmss)
			    -> sortObject(params) -> qs.stringify(params, {encode:false})
			    -> hmac = crypto.createHmac('sha512', secretKey)
			    -> vnp_SecureHash = hmac.update(signData).digest('hex')
			    -> return vnpUrl + '?' + stringify(params)
	RESPONSE: 200 {paymentUrl}

### vnpayReturn (IPN callback)
	INPUT:  req.query (VNPay redirect params)
	CONTROLLER:
		    vnpayService.verifyIpnCall(req.query):
			    -> extract vnp_SecureHash, xoa khoi params
			    -> sortObject -> qs.stringify -> hmac.sha512 -> compare hash
		->> if !verified -> redirect voi loi 'Chu ky khong hop le'
		->> if vnp_ResponseCode==='00':
			DB  db.ParentOrder.update({payment_status:'PAID'},{where:{checkout_code:txnRef}})
			DB  db.PaymentLog.update({status:'PAID'},{where:{order_code:txnRef}})
		->> else:
			DB  db.PaymentLog.update({status:'FAILED'})
		    -> redirect ve frontend
	RESPONSE: redirect to frontend URL

==============================================================================
## 7. PRODUCT MODULE
==============================================================================
File: product.controller.js | Service: product.service.js

### getProducts
	INPUT:  req.query { keyword,categorySlug,gender,minPrice,maxPrice,isNew,isFeatured,sortBy,page,limit,shopId }
	SERVICE: productService.getProducts(filters)
		    -> where = {approval_status:'APPROVED'}
		    -> if keyword: where.name = {Op.like:'%keyword%'}
		    -> if shopId,gender,isNew,isFeatured: where[field]=value
		    -> if minPrice/maxPrice: where.price={Op.gte,Op.lte}
		->> if categorySlug:
			DB  db.Category.findOne({where:{slug},include:[children]})
			    -> allCategoryIds=[parent.id,...children.ids]
			DB  db.Category.findAll({where:{parent_id IN childIds}}) -> grandchildren
			    -> where.category_id={Op.in:allCategoryIds}
		    -> orderMap: price_asc/price_desc/newest/best_sellers/most_viewed
		    -> offset=(page-1)*limit
		DB  db.Product.findAndCountAll({where,include:[ProductImage(primary),Shop,Category],
		      order,limit,offset,distinct:true})
		    enrichProductsRating(rows):
			DB  db.ProductReview.findAll({where:{product_id IN ids},
			      attributes:[product_id,AVG(rating),COUNT(id)],group:[product_id]})
			    -> gan rating_average,review_count vao moi product
		-> return {total,totalPages,currentPage,products}
	RESPONSE: 200 {data} / 500

### getProductBySlug
	INPUT:  req.params.slug
	SERVICE: productService.getProductBySlug(slug)
		DB  db.Product.findOne({where:{slug,approval_status:'APPROVED'},
		      include:[ProductImage,ProductVariant,Category,Shop]})
		ERR if !product -> null
		    enrichProductRating(product):
			DB  db.ProductReview.findOne({where:{product_id},attributes:[AVG(rating),COUNT(id)]})
		DB  db.Product.increment('view_count',{where:{id}})
	RESPONSE: 200 {data} / 404

### addToWishlist
	INPUT:  req.user.id, req.params.productId
	CONTROLLER: DB db.Wishlist.findOrCreate({where:{user_id,product_id}})
	RESPONSE: 200 / 400 / 500

### removeFromWishlist
	INPUT:  req.user.id, req.params.productId
	CONTROLLER: DB db.Wishlist.destroy({where:{user_id,product_id}})
	RESPONSE: 200 / 500

### trackView
	INPUT:  req.user.id (optional), req.body { productId }
	CONTROLLER:
		DB  db.UserViewedProduct.findOrCreate({where:{user_id,product_id}})
		    -> if found: viewed.viewed_at=now; viewed.save()
		DB  db.Product.increment('view_count',{where:{id:productId}})
	RESPONSE: 200 / 500

==============================================================================
## 8. REVIEW MODULE
==============================================================================
File: review.controller.js | Service: review.service.js

### createReview
	INPUT:  req.user.id, req.params.productId, req.body { order_id, rating, comment }
	SERVICE: reviewService.createReview(userId, productId, data)
		TX  BEGIN TRANSACTION
		DB  ShopOrder.findOne({where:{id:order_id,status:['DELIVERED','COMPLETED']},
		      include:[ParentOrder{where:{user_id}}]})
		ERR if !order -> throw 'Don hang khong hop le'
		DB  ProductReview.findOne({where:{user_id,product_id,shop_order_id},paranoid:false})
		ERR if exists -> throw 'Da danh gia san pham nay trong don hang nay'
		DB  ProductReview.create({user_id,product_id,shop_order_id,rating,comment})
		DB  User.increment('loyalty_points',{by:100,where:{id:userId}}) -> +100 diem thuong
		TX  COMMIT
		ERR ROLLBACK neu loi
	RESPONSE: 201 {data:review} / 400 / 500

### getProductReviews
	INPUT:  req.params.productId, req.query { page, limit }
	SERVICE: reviewService.getProductReviews(productId, page, limit)
		DB  ProductReview.findAndCountAll({where:{product_id},
		      include:[User{id,email}->profile],order:[['created_at','DESC']],limit,offset})
		-> return {total,page,totalPages,reviews}
	RESPONSE: 200 {data} / 500

### updateReview
	INPUT:  req.user.id, req.params.productId, req.body { order_id, rating, comment }
	SERVICE: reviewService.updateReview(userId, productId, data)
		DB  ProductReview.findOne({where:{user_id,product_id,shop_order_id}})
		ERR if !review -> throw 'Khong tim thay danh gia'
		DB  review.update({rating,comment})
	RESPONSE: 200 {data} / 404 / 500

==============================================================================
## 9. COUPON MODULE
==============================================================================
File: coupon.controller.js | Service: coupon.service.js

### getValidCoupons
	INPUT:  req.user?.id (optional)
	SERVICE: couponService.getValidCoupons(userId)
		DB  Coupon.findAll({where:{start_date<=now,end_date>=now,
		      OR:[usage_limit null, used_count<usage_limit]},
		      include:[Category],order:[['discount_value','DESC']]})
		->> if userId:
			DB  UserCoupon.findAll({where:{user_id,is_used:false},attributes:['coupon_id']})
			    -> map them isSaved cho moi coupon
	RESPONSE: 200 {data:coupons}

### saveCoupon
	INPUT:  req.user.id, req.params.couponId
	SERVICE: couponService.saveCoupon(userId, couponId)
		DB  Coupon.findByPk(couponId)
		ERR if !coupon -> throw 'Khong ton tai'
		ERR if end_date < now -> throw 'Da het han'
		ERR if used_count >= usage_limit -> throw 'Da het luot'
		DB  UserCoupon.findOrCreate({where:{user_id,coupon_id},defaults:{is_used:false}})
		ERR if !created -> throw 'Da luu roi'
	RESPONSE: 200 / 400 / 500

### saveCouponByCode
	INPUT:  req.user.id, req.body { code }
	SERVICE: couponService.saveCouponByCode(userId, code)
		DB  Coupon.findOne({where:{code}})
		ERR validate het han / het luot (giong saveCoupon)
		DB  UserCoupon.findOrCreate(...)
		ERR if !created -> throw 'Da luu roi'
	RESPONSE: 200 / 400

### unsaveCoupon
	INPUT:  req.user.id, req.params.couponId
	SERVICE: couponService.unsaveCoupon(userId, couponId)
		DB  UserCoupon.findOne({where:{user_id,coupon_id,is_used:false}})
		ERR if !found -> throw 'Khong tim thay hoac da su dung'
		DB  userCoupon.destroy()
	RESPONSE: 200 / 400

### getMySavedCoupons
	INPUT:  req.user.id
	SERVICE: couponService.getMySavedCoupons(userId)
		DB  UserCoupon.findAll({where:{user_id,is_used:false},
		      include:[Coupon{where:{end_date>=now,used_count<limit OR null}}]})
	RESPONSE: 200 {data:coupons}

### getMyVoucherWallet
	INPUT:  req.user.id
	SERVICE: couponService.getMyVoucherWallet(userId)
		DB  UserCoupon.findAll({where:{user_id},include:[Coupon->Category],order:[['saved_at','DESC']]})
		    -> validCoupons: !is_used && !expired && !outOfLimit
		    -> historyCoupons: is_used(USED) || expired/outOfLimit(EXPIRED)
	RESPONSE: 200 {data:{validCoupons,historyCoupons}}

==============================================================================
## 10. SHOP MODULE
==============================================================================
File: shop.controller.js | Service: shop.service.js

### registerShop
	INPUT:  req.user.id, req.body { name, description, avatar_url }
	SERVICE: shopService.registerShop(userId, shopData)
		TX  BEGIN TRANSACTION
		DB  db.Shop.findOne({where:{OR:[{vendor_id},{shop_name}]},paranoid:false})
		->> if exists && deleted_at: restore() + update({status:'PENDING'})
		->> if exists && status==='REJECTED': update({status:'PENDING'})
		->> if exists (active): ERR throw 'Da co gian hang hoac ten da ton tai'
		->> else: DB db.Shop.create({vendor_id,shop_name,shop_logo,description,status:'PENDING'})
		TX  COMMIT
		EM  notificationService.createNotificationForRole('admin','Yeu cau dang ky gian hang',...)
	RESPONSE: 201 {data:shop} / 400 / 500

### getShopProfile
	INPUT:  req.params.shopId
	SERVICE: shopService.getShopProfile(shopId)
		DB  db.Shop.findByPk(shopId)
		ERR if !shop -> null
		DB  db.Product.count({where:{shop_id,approval_status:'APPROVED'}})
		DB  db.ProductReview.count({include:[Product{shop_id}]})
		-> return {...shop, productsCount, reviewsCount}
	RESPONSE: 200 / 404

### getShopStatistics
	INPUT:  req.user.id (vendor) -> lookup shopId
	SERVICE: shopService.getShopStatistics(shopId)
		DB  db.OrderItem.findAll({include:[ShopOrder{shop_id,status ne CANCELLED}]})
		DB  db.ReturnRequest.findAll({where:{status:COMPLETED|RESOLVED},
		      include:[ShopOrder{shop_id,RETURNED},ReturnItem->OrderItem]})
		    -> tinh returnedAmountByOrder
		DB  db.Product.count({where:{shop_id,APPROVED}})
		DB  db.ProductReview.count (join Product{shop_id})
		    -> tinh dailyRevenue[7 ngay] (tru hang bi tra)
		-> return {totalRevenue,totalOrders,productsCount,commentsCount,dailyRevenue,pendingOrders}
	RESPONSE: 200 {data:statistics}

### getShopOrders (vendor)
	INPUT:  req.user.id, req.query { page,limit,status,search,startDate,endDate }
	SERVICE: shopService.getShopOrders(shopId, filters)
		    -> where={shop_id}
		    -> if status: where.status
		    -> if date range: where.created_at={Op.between:[start,end]}
		    -> if search: JOIN ParentOrder, shipping_address LIKE '%keyword%'
		DB  db.ShopOrder.findAndCountAll({where,include:[OrderItem->Variant->Product->Image,ParentOrder],limit,offset})
	RESPONSE: 200 {data:{orders,total,totalPages}}

### updateShop
	INPUT:  req.user.id, req.body { shop_name, description, shop_logo... }
	SERVICE: shopService.updateShop(userId, shopData)
		DB  db.Shop.findOne({where:{vendor_id:userId}})
		ERR if !shop -> throw 'Shop not found'
		DB  shop.update(shopData)
	RESPONSE: 200 {data:shop}

==============================================================================
## 11. NOTIFICATION MODULE
==============================================================================
File: notification.controller.js | Service: notification.service.js

### getNotifications
	INPUT:  req.user.id
	SERVICE: notificationService.getNotificationsByUserId(userId)
		DB  db.Notification.findAll({where:{user_id},order:[['created_at','DESC']]})
	RESPONSE: 200 {data:notifications}

### markAsRead
	INPUT:  req.user.id, req.params.id
	SERVICE: notificationService.markAsRead(notifId, userId)
		DB  db.Notification.findOne({where:{id,user_id}})
		->> if found: DB notif.update({is_read:true})
	RESPONSE: 200 / 404

### markAllAsRead
	INPUT:  req.user.id
	SERVICE: notificationService.markAllAsRead(userId)
		DB  db.Notification.update({is_read:true},{where:{user_id,is_read:false}})
	RESPONSE: 200

[createNotification - INTERNAL]
	DB  db.Notification.create({user_id,title,content,type,is_read:false})

[createNotificationForRole - INTERNAL]
	DB  db.Role.findOne({where:{role_name}})
	DB  db.User.findAll({where:{role_id},attributes:['id']})
	DB  db.Notification.bulkCreate([...]) -> gui hang loat

==============================================================================
## 12. USER MODULE
==============================================================================
File: user.controller.js | Service: user.service.js

### getProfile
	INPUT:  req.user.id
	SERVICE: userService.getUserProfileById(id)
		DB  db.User.findByPk(id,{attributes:['loyalty_points','email','phone','role_id'],
		      include:[Role{role_name},UserProfile]})
		    -> merge {...userProfile,loyalty_points,email,phone,role}
	RESPONSE: 200 {data:profile} / 404

### updateProfile
	INPUT:  req.user.id, req.body { full_name, date_of_birth, gender, phone, avatar_url, operating_areas }
	SERVICE: userService.updateUserProfile({user_id,...data})
		->> if data.phone !== undefined:
			DB  db.User.findByPk(user_id)
			DB  userAccount.update({phone})
		DB  db.UserProfile.findOne({where:{user_id}})
		->> if found:
			DB  userProfile.update({full_name,birthday,gender,avatar_url,shipper_shop_id,operating_areas})
		->> else:
			DB  db.UserProfile.create({user_id,full_name,...})
	RESPONSE: 200 {data} / 500

### getFavorites
	INPUT:  req.user.id
	SERVICE: userService.getFavorites(userId)
		DB  db.Wishlist.findAll({where:{user_id},include:[Product->ProductImage(primary)],order:[['added_at','DESC']]})
	RESPONSE: 200 {data}

### getViewedProducts
	INPUT:  req.user.id
	SERVICE: userService.getViewedProducts(userId)
		DB  db.UserViewedProduct.findAll({where:{user_id},include:[Product->ProductImage(primary)],order:[['viewed_at','DESC']]})
	RESPONSE: 200 {data}

==============================================================================
## 13. RETURN MODULE
==============================================================================
File: return.controller.js | Service: return.service.js

### createReturnRequest
	INPUT:  req.user.id, req.params.shopOrderId, req.body { reason, evidenceUrls[], returnItems[] }
	SERVICE: returnService.createReturnRequest(userId, shopOrderId, data)
		TX  BEGIN TRANSACTION
		DB  db.ShopOrder.findOne({where:{id,status:['DELIVERED','COMPLETED']},
		      include:[ParentOrder{user_id},OrderItem]})
		ERR if !order -> throw 'Khong tim thay don hang hop le'
		[KIEM TRA THOI HAN TRA HANG]
		->> if status==='COMPLETED': limitDays=15
		->> if status==='DELIVERED': limitDays=7
			DB  db.ShopOrderStatusHistory.findOne({where:{shop_order_id,new_status},order:[['changed_at','DESC']]})
			    -> checkTime = log.changed_at
		ERR if now-checkTime > limitDays*86400000 -> throw 'Da qua X ngay'
		DB  db.ReturnRequest.findOne({where:{shop_order_id,status:['PENDING','APPROVED_BY_SHOP','RESOLVED_BY_ADMIN','REJECTED']}})
		ERR if exists -> throw 'Da co yeu cau dang xu ly'
		ERR if returnItems.length===0 -> throw 'Phai chon it nhat 1 san pham'
		DB  db.ReturnRequest.create({shop_order_id,user_id,reason,evidence_urls:JSON,status:'PENDING'})
		[VONG LAP returnItems]
			    -> orderItem = order.items.find(i.id===reqItem.orderItemId)
			ERR if !orderItem -> throw 'San pham tra khong thuoc don hang'
			ERR if qty<=0 || qty>orderItem.quantity -> throw 'So luong khong hop le'
			DB  db.ReturnItem.create({return_request_id,order_item_id,quantity,condition_note})
		    -> oldStatus = order.status
		DB  order.update({status:'RETURN_PENDING'})
		DB  db.ShopOrderStatusHistory.create(...)
		[CAP NHAT VI SHOP - freeze tien neu don COMPLETED]
		DB  db.ShopWallet.findOne({where:{shop_id}})
		->> if oldStatus==='COMPLETED':
			    amountToFreeze = final_amount - commission_amount
			    wallet.balance -= amountToFreeze; wallet.pending_balance += amountToFreeze
			DB  shopWallet.save()
		TX  COMMIT
		EM  notificationService.createNotification(vendor_id,'Yeu cau tra hang moi',...)
		ERR ROLLBACK neu loi
	RESPONSE: 201 {data:returnRequest} / 400 / 404 / 500

==============================================================================
## 14. SHIPMENT MODULE
==============================================================================
File: shipment.controller.js -> re-export shipment.service.js

### createShipment [noi bo - goi tu order.service khi PREPARING]
	SERVICE: shipmentService.createShipment(shopOrderId, shipperId)
		    -> generateTrackingNumber() -> ma ngau nhien
		DB  db.Shipment.create({shop_order_id,shipper_id,tracking_number,status:'PENDING_PICKUP',shipping_fee:30000})
		DB  db.ShipmentHistory.create({shipment_id,status:'PENDING_PICKUP',note:'Cho shipper lay'})

### addShipmentHistory [shipper cap nhat van don]
	INPUT:  shipmentId,status,location,note,proofImageUrl,shipperId,collectedShippingFee,isBom
	SERVICE: shipmentService.addShipmentHistory(...)
		DB  db.Shipment.findByPk(shipmentId)
		ERR if !shipment -> throw 'Khong tim thay van don'
		ERR if shipper_id!==shipperId && shipper_id!==null -> throw 'Khong co quyen'
		TX  BEGIN TRANSACTION
		DB  shipment.update({status}) [+ shipper_id neu chua co -> shipper nhan don]
		DB  db.ShipmentHistory.create({shipment_id,status,location,note,proof_image_url})
		[DONG BO VOI SHOPORDER khi DELIVERED/FAILED/RETURNED]
		->> if status==='DELIVERED': orderStatus='DELIVERED'
		->> if status==='FAILED':
			    newAttempts = delivery_attempts + 1
			DB  shopOrder.update({delivery_attempts:newAttempts})
			->> if note==='Nguoi mua tu choi nhan' || newAttempts>=3:
				    orderStatus='RETURN_PENDING'
				->> phan loai BOM (isBom flag):
					    isBom=true: logNote='BOM: Nguoi mua tu choi...'
					    isBom=false: logNote='Ly do chinh dang: loi SP/giao sai'
				->> COD: newShippingFee = collectedShippingFee (da thu)
				->> ONLINE: newShippingFee = 30000
				DB  shopOrder.update({shipping_fee:newShippingFee})
		->> if status==='RETURNED': orderStatus='RETURNED'
		    -> orderService.updateOrderStatus(shopOrderId,'system',orderStatus,'system',logNote)
		       [goi day du: hoan kho, hoan tien, notification - xem Order Module]
		TX  COMMIT
		ERR ROLLBACK neu loi
	RESPONSE: 200 {data} / 400 / 403 / 500

### getShipmentByOrderId
	INPUT:  req.params.orderId
	SERVICE: shipmentService.getShipmentByOrderId(orderId)
		DB  db.Shipment.findOne({where:{shop_order_id},include:[ShipmentHistory,User(shipper)->UserProfile]})
		    -> flatten shipper.profile -> shipper object
	RESPONSE: 200 {data} / 404

==============================================================================
## 15. ADMIN MODULE
==============================================================================
File: admin.controller.js | Service: admin.service.js

### createUser
	INPUT:  req.user.id (adminId), req.body { email,password,full_name,role,phone,gender,shipper_shop_id }
	SERVICE: adminService.createUser(adminId, payload)
		TX  BEGIN TRANSACTION
		DB  db.User.findOne({where:{email}})
		ERR if exists -> throw 'Email da duoc su dung'
		DB  db.User.findOne({where:{phone}}) [neu phone co]
		ERR if exists -> throw 'SDT da duoc su dung'
		DB  db.Role.findOne({where:{role_name}})
		ERR if !role -> throw 'Khong tim thay vai tro'
		->> if role==='shipper': random password 8 ky tu alphanumeric
		ERR if !password -> throw 'Mat khau la bat buoc'
		    -> bcrypt.genSalt(10); bcrypt.hash(password,salt)
		DB  db.User.create({email,phone,password:hashed,role_id,status:'ACTIVE',auth_provider:'local'})
		DB  db.UserProfile.create({user_id,full_name,avatar_url,gender,shipper_shop_id})
		->> if role==='vendor':
			DB  db.Shop.create({vendor_id,shop_name:'Shop cua X',status:'APPROVED'}) -> auto-approve
		TX  COMMIT
		EM  notificationService.createNotification(adminId,'Tao tai khoan thanh cong',...)
		->> if role==='shipper':
			EM  sendShipperAccountCreated(email,full_name,rawPassword) -> email thong bao
	RESPONSE: 201 {data:user} / 400

### getUsersByRole
	INPUT:  req.query.role
	SERVICE: adminService.getUsersByRole(role)
		DB  db.Role.findOne({where:{role_name}})
		DB  db.User.findAll({where:{role_id},include:[UserProfile->Shop(shipperShop)],order:[['created_at','DESC']]})
	RESPONSE: 200 {data:users}

### lockUser / unlockUser
	INPUT:  req.user.id (adminId), req.params.id (targetUserId)
	SERVICE: adminService.lockUser(adminId, userId)
		DB  db.User.findByPk(userId,{include:[Role]})
		ERR if !user -> throw 'User not found'
		ERR if role_name==='admin' -> throw 'Cannot lock admin'
		DB  user.update({status:'INACTIVE'}) // hoac 'ACTIVE'
		EM  notificationService.createNotification(userId,'Tai khoan bi khoa/mo',...)
		EM  notificationService.createNotification(adminId,'Thao tac thanh cong',...)
	RESPONSE: 200 / 400 / 404

### approveShop / rejectShop
	INPUT:  req.params.shopId, req.body? { reason }
	SERVICE: adminService.approveShop / rejectShop
		DB  db.Shop.findByPk(shopId)
		DB  shop.update({status:'APPROVED'}) // hoac 'REJECTED'
		EM  notificationService.createNotification(vendor_id,'Gian hang duoc duyet/tu choi',...)
	RESPONSE: 200 / 404

### approveProduct / rejectProduct
	INPUT:  req.params.productId, req.body { reason? }
	SERVICE: adminService.approveProduct / rejectProduct
		DB  db.Product.findByPk(productId,{include:[Shop]})
		DB  product.update({approval_status:'APPROVED'}) // hoac 'REJECTED'
		EM  notificationService.createNotification(vendor_id,'San pham duyet/tu choi',...)
	RESPONSE: 200 / 404

### getAdminDashboard
	SERVICE: adminService.getDashboardStats()
		DB  db.User.count()
		DB  db.Shop.count({where:{status:'APPROVED'}})
		DB  db.ParentOrder.count()
		DB  db.ParentOrder.sum('total_amount')
		DB  db.ShopOrder.findAll({where:{status:'PENDING'},limit:10})
		DB  db.User.findAll({order:[DESC],limit:5})
	RESPONSE: 200 {data}

==============================================================================
## 16. MANAGER MODULE
==============================================================================
File: manager.controller.js | Service: admin.service.js (dung chung)

Manager co quyen tuong tu Admin NHUNG:
	- Khong the lockUser voi role admin
	- Khong the sua system settings
-> Tat ca service call giong Admin module

==============================================================================
## 17. BLOG MODULE
==============================================================================
File: blog.controller.js

### getBlogs
	DB  db.Blog.findAll({where:{status:'PUBLISHED'},order:[['created_at','DESC']]})
	RESPONSE: 200 {data}

### getBlogBySlug
	DB  db.Blog.findOne({where:{slug,status:'PUBLISHED'}})
	RESPONSE: 200 {data} / 404

==============================================================================
## 18. AI CHAT MODULE
==============================================================================
File: aiChat.controller.js

### sendMessage
	INPUT:  req.user?.id, req.body { message, history[] }
	CONTROLLER:
		    -> build system prompt (ecommerce context)
		    -> goi Google Generative AI (Gemini) API voi history + message
		    -> return {reply: aiResponseText}
	RESPONSE: 200 {data:{reply}} / 500

==============================================================================
## 19. SHIPPER MODULE (Shipment Service)
==============================================================================
File: shipment/backend/controllers/shipper.controller.js

### getMyShipments
	INPUT:  req.user.id (shipperId), req.query { status }
	SERVICE: shipperService.getMyShipments(shipperId, {status})
		DB  db.Shipment.findAll({where:{shipper_id,status?},
		      include:[ShipmentHistory,ShopOrder->ParentOrder]})
	RESPONSE: 200 {data:shipments}

### submitCODReconciliation
	INPUT:  req.user.id, req.body { shopOrderIds[], totalAmount }
	SERVICE: shipperService.submitCODReconciliation(shipperId, data)
		DB  db.ShopOrder.findAll({where:{id IN ids,shipper_id,cod_status:'HELD_BY_SHIPPER'}})
		ERR if khong khop -> error
		DB  db.CodReconciliation.create({shipper_id,total_amount,status:'PENDING'})
		DB  db.ShopOrder.update({cod_status:'PENDING_RECONCILIATION'},{where:{id IN ids}})
	RESPONSE: 200 {data}

### uploadImages
	INPUT:  req.files (multipart/form-data)
	CONTROLLER: -> lay urls tu multer/cloudinary -> return urls[]
	RESPONSE: 200 {data:urls}

==============================================================================
## LUONG TONG QUAN - DAT HANG (HAPPY PATH SEQUENCE)
==============================================================================

[1] Client -> POST /orders/checkout/calculate
	Controller -> orderService.calculateCheckout()
		DB SystemSetting (earnRate, redeemRate)
		DB Product, ProductVariant (gia)
		DB Coupon, UserCoupon (validate ma)
		DB User (diem tich luy)
		DB ShopOrderStatusHistory (bomCount)
	<- 200 checkoutSummary

[2] Client -> POST /orders (COD)
	Controller -> orderService.createOrder()
		TX BEGIN
		DB ParentOrder.create()
		DB User.decrement(loyalty_points)
		[PER SHOP]
			DB PlatformCommission.findOne()
			DB ShopOrder.create()
			DB OrderItem.bulkCreate()
			DB ShopOrderStatusHistory.create()
			DB ProductVariant.decrement(stock) x N items
		DB CartItem.destroy()
		DB PaymentLog.create()
		DB Coupon.increment(used_count)
		DB UserCoupon.update(is_used)
		TX COMMIT
		EM Notify user 'Dat hang thanh cong'
		EM Notify vendor 'Don hang moi'
	<- 201 parentOrder

[2b] Client -> POST /orders (VNPAY)
	-> createOrder() [giong tren]
	Client -> POST /payment/vnpay/create
		DB ParentOrder.findOne(orderCode)
		vnpayService.createPaymentUrl() -> sign HMAC-SHA512
	<- 200 {paymentUrl}
	Client -> VNPay Gateway
	VNPay -> GET /payment/vnpay/return
		vnpayService.verifyIpnCall() -> verify hash
		DB ParentOrder.update(payment_status='PAID')
		DB PaymentLog.update(status='PAID')
	-> redirect frontend

[3] Vendor -> PUT /orders/:id/status {status:'CONFIRMED'}
	-> orderService.updateOrderStatus(CONFIRMED)
		DB Shop.findOne(vendor check)
		DB ShopOrder.update(CONFIRMED)
		DB ShopOrderStatusHistory.create()
		EM Notify customer 'Don xac nhan'

[4] Vendor -> PUT /orders/:id/status {status:'PREPARING'}
	-> orderService.updateOrderStatus(PREPARING)
		autoAssignShipperByArea():
			DB User.findAll(role=shipper,ACTIVE)
			DB ShopOrder.findAll(active per shipper)
			-> scoring (area match, workload) -> chon shipper
		shipmentService.createShipment(shopOrderId, shipperId)
			DB Shipment.create(PENDING_PICKUP)
			DB ShipmentHistory.create()
		DB ShopOrder.update(shipper_id, PREPARING)
		DB ShopOrderStatusHistory.create()
		EM Notify customer 'Dang chuan bi'
		EM Notify shipper 'Co don moi'

[5] Shipper -> POST /shipments/:id/history {status:'DELIVERED'}
	-> shipmentService.addShipmentHistory()
		TX BEGIN
		DB Shipment.update(DELIVERED)
		DB ShipmentHistory.create()
		-> orderService.updateOrderStatus(DELIVERED)
			DB ShopOrder.update(delivered_at, cod info)
			DB ParentOrder.update(PAID) [COD]
			DB SystemSetting.findAll(tax_rate, gateway_fee)
			DB ShopWallet.findOrCreate()
			DB wallet.increment(pending_balance)
			DB ShopOrderStatusHistory.create()
			EM Notify customer 'Giao thanh cong'
			EM Notify vendor
		TX COMMIT

[6] Customer -> PUT /orders/:id/status {status:'COMPLETED'}
	-> orderService.updateOrderStatus(COMPLETED)
		DB ShopWallet.update(balance+=net, pending-=deduct)
		DB User.increment(loyalty_points, by:points_earned)
		DB ShopOrderStatusHistory.create()
		EM Notify customer '+X diem'
		EM Notify vendor 'Don hoan tat'

==============================================================================
