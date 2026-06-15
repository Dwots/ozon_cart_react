const ports = new Set();

let cart = [];

function sendCartToPort(port) {
  port.postMessage({
    type: 'CART_UPDATED',
    cart,
  });
}

function broadcastCart() {
  ports.forEach((port) => {
    sendCartToPort(port);
  });
}

function addItem(product) {
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    cart = cart.map((item) => {
      if (item.id === product.id) {
        return {
          ...item,
          quantity: item.quantity + 1,
        };
      }

      return item;
    });
  } else {
    cart = [
      ...cart,
      {
        ...product,
        quantity: 1,
      },
    ];
  }
}

function removeItem(productId) {
  cart = cart.filter((item) => item.id !== productId);
}

function decreaseItem(productId) {
  cart = cart
    .map((item) => {
      if (item.id === productId) {
        return {
          ...item,
          quantity: item.quantity - 1,
        };
      }

      return item;
    })
    .filter((item) => item.quantity > 0);
}

function clearCart() {
  cart = [];
}

self.onconnect = function (event) {
  const port = event.ports[0];

  ports.add(port);

  port.onmessage = function (event) {
    const message = event.data;

    switch (message.type) {
      case 'HYDRATE_CART': {
        if (cart.length === 0 && Array.isArray(message.cart)) {
          cart = message.cart;
        }

        broadcastCart();
        break;
      }

      case 'GET_CART': {
        sendCartToPort(port);
        break;
      }

      case 'ADD_ITEM': {
        addItem(message.product);
        broadcastCart();
        break;
      }

      case 'REMOVE_ITEM': {
        removeItem(message.productId);
        broadcastCart();
        break;
      }

      case 'DECREASE_ITEM': {
        decreaseItem(message.productId);
        broadcastCart();
        break;
      }

      case 'CLEAR_CART': {
        clearCart();
        broadcastCart();
        break;
      }

      case 'DISCONNECT': {
        ports.delete(port);
        port.close();
        break;
      }

      default: {
        break;
      }
    }
  };

  port.start();
};
