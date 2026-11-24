export interface SepayCheckoutPayload {
  checkoutUrl: string;
  fields: Record<string, string | number>;
}

export const submitSepayCheckoutForm = (payload: SepayCheckoutPayload) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payload.checkoutUrl;
  form.style.display = "none";

  Object.entries(payload.fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};
