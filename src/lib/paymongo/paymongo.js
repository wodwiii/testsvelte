// @ts-nocheck
export async function createCheckoutSession(plan) {
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: 'Basic c2tfdGVzdF9wQzFpYXRaMzNyVUJQblFhMTN3TDg5UFY6'
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            description: 'http://localhost:5173/dashboard',
            payment_method_types: ['gcash', 'card'],
            success_url: 'http://localhost:5173/dashboard',
            line_items: [
              {
                currency: 'PHP',
                amount: plan === 'Lite' ? 30000 : 60000,
                description: `${plan} Plan`,
                name: `${plan} Plan`,
                quantity: 1
              }
            ]
          }
        }
      })
    };
  
    try {
      const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', options);
      const data = await response.json();
      return data.data.attributes.checkout_url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
  