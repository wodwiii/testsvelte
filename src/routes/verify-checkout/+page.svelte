<script>
    // @ts-nocheck
    
        import { onMount } from 'svelte';
        import { authStore } from '../../store/authStore';
        import { getDatabase, ref, get } from 'firebase/database';
        import { database } from '../../lib/firebase/firebase.client';
    
        let status = '';
        let subStatus = ''
        let userID = '';
        let unsubscribe;
    
        onMount(() => {
            unsubscribe = authStore.subscribe(async (auth) => {
                if (auth.currentUser) {
                    userID = auth.currentUser.uid;
                    await verifyPayment();
                }
            });
    
            return () => {
                if (unsubscribe) unsubscribe();
            };
        });
    
        async function verifyPayment() {
        try {
            const checkout = await getCheckoutForUser(userID);
            if (!checkout) {
                alert('No checkout found.');
                window.location.href = '/dashboard';
                return;
            }
    
            const timeoutDuration = 10000; 
            const startTime = Date.now();
            let status = '';
    
            while (status !== 'paid') {
                const elapsedTime = Date.now() - startTime;
    
                if (elapsedTime > timeoutDuration) {
                    alert('Verification timed out. Please try again.');
                    window.location.href = '/dashboard';
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 2000));
                console.log("🚀 ~ verifyPayment ~ checkout.data.attributes.payment_intent.id:", checkout.data.attributes.payment_intent.id)
                const data = await checkPaymentStatus(checkout.data.attributes.payment_intent.id);
                status = data.data.attributes.status;
                console.log(`status: ${status}`);
                if (status === 'succeeded') {
                    alert('Payment Successful!');
                    await verifyTransaction(userID, checkout.data.attributes.payment_intent.id);
                    window.location.href = '/dashboard';
                    break;
                } else if (status === 'failed') {
                    alert('Payment Failed. Please try again.');
                    window.location.href = '/dashboard';
                    break;
                }
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
            alert('An error occurred while verifying the payment. Please try again.');
        }
    }
    
        const getCheckoutForUser = async (userID) => {
            try {
                const path = `checkouts/${userID}`;
                const dbRef = ref(database, path);
                const snapshot = await get(dbRef);
                if (snapshot.exists()) {
                    let latestCheckout = null;
                    let latestTimestamp = 0;
                    snapshot.forEach(childSnapshot => {
                    const data = childSnapshot.val();
                    const timestamp = data.created_at;
                        if (timestamp > latestTimestamp) {
                            latestTimestamp = timestamp;
                            latestCheckout = data;
                        }
                    });
                    return latestCheckout;
                } else {
                    console.log('No data found for the specified path.');
                    return null;
                }
            } catch (error) {
                console.error('Error retrieving subscriptions:', error);
                throw error;
            }
        };
    
        const verifyTransaction = async (userID, paymentIntenID) => {
            try {
                const response = await fetch('/api/verify-transactions', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uid: userID,
                        paymentIntenID: paymentIntenID
                    })
                });
    
                if (!response.ok) {
                    throw new Error('Failed to verify transaction');
                }
    
                const data = await response.json();
                console.log('Verification response:', data);
            } catch (error) {
                console.error('Error verifying transaction:', error);
            }
        };
    
        const checkPaymentStatus = async (checkoutID) => {
            console.log('Checking payment status...')
            const url = new URL('/api/check-payment-status', window.location.origin);
            url.searchParams.append('id', checkoutID);
    
            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error('Failed to fetch payment status');
            }
    
            const data = await response.json();
            return data;
        };
    </script>
    
    <div class="min-h-[100vh] text-center">
        <div class="font-bold text-3xl text-[#fe0000] mt-16">Verifying payment...</div>
    </div>