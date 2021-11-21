import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

type ProductResponse = Omit<Product, "amount">;

type StockResponse = {
  id: number;
  amount: number;
};

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storedCart = localStorage.getItem("@RocketShoes:cart");

    if (storedCart) return JSON.parse(storedCart);

    return [];
  });

  // useEffect(() => {
  //   localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  // }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<StockResponse>(`stock/${productId}`);

      if (stockResponse.status !== 200)
        throw new Error("Unexpected response status code");

      const { amount } = stockResponse.data;

      if (amount <= 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const existentProductInCart =
        cart.filter((product) => product.id === productId)[0] ?? null;

      if (existentProductInCart) {
        await updateProductAmount({
          productId,
          amount: existentProductInCart.amount + 1,
        });

        return;
      }

      const productResponse = await api.get<ProductResponse>(
        `products/${productId}`
      );

      if (productResponse.status !== 200)
        throw new Error("Unexpected response status code");

      const product = productResponse.data;

      const newCartData = [...cart, { ...product, amount: 1 }];

      setCart(newCartData);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartData));
    } catch (error) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const [productToRemove] = cart.filter(
        (product) => product.id === productId
      );

      if (!productToRemove) throw new Error("Product not found");

      const newCartData = cart.filter(
        (product) => product.id !== productToRemove.id
      );

      setCart(newCartData);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartData));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const stockResponse = await api.get<StockResponse>(`stock/${productId}`);

      if (stockResponse.status !== 200)
        throw new Error("Unexpected response status");

      const { amount: stockAmount } = stockResponse.data;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      setCart(
        cart.map((product) => {
          if (product.id == productId) product.amount = amount;

          return product;
        })
      );
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    } catch (error) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
