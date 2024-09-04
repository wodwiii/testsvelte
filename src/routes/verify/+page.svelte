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
			const subscriptionID = await getSubscriptionForUser(userID);
			if (!subscriptionID) {
				alert('No subscription found.');
				window.location.href = '/dashboard';
				return;
			}
			while (status !== 'succeeded' && subStatus !== 'failed') {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				const data = await checkPaymentStatus(subscriptionID);
				status = data.data.attributes.latest_invoice.payment_intent.status;
				subStatus = data.data.attributes.status;
				if (status === 'succeeded' && subStatus === 'active') {
					alert('Payment Successful!');
					await verifyTransaction(userID, subscriptionID);
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

	const getSubscriptionForUser = async (userID) => {
		try {
			const path = `subs/${userID}`;
			const dbRef = ref(database, path);
			const snapshot = await get(dbRef);
			if (snapshot.exists()) {
				let latestSubscription = null;
            	let latestTimestamp = 0;
				snapshot.forEach(childSnapshot => {
                const data = childSnapshot.val();
                const timestamp = data.created_at;
					if (timestamp > latestTimestamp) {
						latestTimestamp = timestamp;
						latestSubscription = data;
					}
				});
				return latestSubscription.data.id;
			} else {
				console.log('No data found for the specified path.');
				return null;
			}
		} catch (error) {
			console.error('Error retrieving subscriptions:', error);
			throw error;
		}
	};

	const verifyTransaction = async (userID, subscriptionID) => {
		try {
			const response = await fetch('/api/verify-transactions', {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					uid: userID,
					subs_id: subscriptionID
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

	const checkPaymentStatus = async (subscriptionID) => {
		console.log('Checking payment status...')
		const url = new URL('/api/check-payment-status', window.location.origin);
		url.searchParams.append('id', subscriptionID);

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