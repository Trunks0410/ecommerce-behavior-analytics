import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CartState {
  itemCount: number;
}

const initialState: CartState = {
  itemCount: 0,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCartCount: (state, action: PayloadAction<number>) => {
      state.itemCount = action.payload;
    },
    incrementCartCount: (state, action: PayloadAction<number>) => {
      state.itemCount += action.payload;
    },
    decrementCartCount: (state, action: PayloadAction<number>) => {
      state.itemCount -= action.payload;
      if (state.itemCount < 0) state.itemCount = 0;
    },
    clearCartCount: (state) => {
      state.itemCount = 0;
    },
  },
});

export const { setCartCount, incrementCartCount, decrementCartCount, clearCartCount } = cartSlice.actions;

export default cartSlice.reducer;
