<script>
// @ts-nocheck


	import Modal from './Modal.svelte';
	import { subscription } from '../store/authStore';
	import { get, ref, update } from 'firebase/database';
	import { database } from '$lib/firebase/firebase.client';
	export let closeModal;
	export let showManageModal;
	export let uid;
	const handleCancelSub = async () => {
		const subscriptionData = $subscription;
		try {
			const response = await cancelSubscription(uid);
			console.log('Subscription cancelled:', response);
			alert('Subscription cancelled successfully!');
			closeModal();
			window.location.reload();
		} catch (error) {
			console.error('Error:', error);
			alert('An error occurred while cancelling the subscription.');
		}
	};

	const cancelSubscription = async (uid) => {
		const verifiedRef = ref(database, 'verified');
		try {
			const snapshot = await get(verifiedRef);
			if (snapshot.exists()) {
				const allVerified = snapshot.val();
				const userSubscriptionKey = Object.keys(allVerified).find((key) => key.startsWith(uid));

				if (userSubscriptionKey) {
					const updates = {};
					updates[`${userSubscriptionKey}/status`] = 'pending_cancelled';
					await update(verifiedRef, updates);
					return { success: true, message: 'Subscription cancelled successfully' };
				} else {
					throw new Error('Subscription not found');
				}
			} else {
				throw new Error('No verified subscriptions found');
			}
		} catch (error) {
			console.error('Error cancelling subscription:', error);
			throw error;
		}
	};

	const handleChangePayment = async () => {
		alert('Change payment method functionality is not implemented yet.');
		closeModal();
		window.location.reload();
	};
</script>

<Modal show={showManageModal} onClose={closeModal} title="Manage Your Plan">
	<div class="flex flex-col space-y-2">
		<button
			on:click={() => handleChangePayment()}
			class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
		>
			Change Payment Method
		</button>
		<button
			on:click={() => handleCancelSub()}
			class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
		>
			Cancel Subscription
		</button>
	</div>
</Modal>
