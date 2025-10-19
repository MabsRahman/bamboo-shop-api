export class CreateOrderDto {
  cartItems: { productId: number; quantity: number }[];
  addressId: number;
  paymentMethod: 'COD' | 'BKASH' | 'NAGAD';
  couponCode?: string;
}