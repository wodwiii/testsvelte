<script>
// @ts-nocheck


	import Modal from './Modal.svelte';
	import { subscription } from '../store/authStore';
	import { set, get, ref, update } from 'firebase/database';
	import { database } from '$lib/firebase/firebase.client';
	import { cancelSubscription } from '$lib/api-call';
	export let closeModal;
	export let showManageModal;
	export let uid;

	const handleCancelSub = async () => {
		try {
			const response = await cancelSubs(uid);
			console.log('Subscription cancelled:', response);
			alert('Subscription cancelled successfully!');
			closeModal();
			window.location.reload();
		} catch (error) {
			console.error('Error:', error);
			alert('An error occurred while cancelling the subscription.');
		}
	};

	const cancelSubs = async (uid) => {
		const verifiedRef = ref(database, `verified/${uid}`);

		try {
			const snapshot = await get(verifiedRef);
			if (snapshot.exists()) {
				let latestSubscription = null;
				let latestTimestamp = 0;
				let latestKey = null;
				snapshot.forEach((childSnapshot) => {
					const data = childSnapshot.val();
					const timestamp = data.created_at;
					if (timestamp > latestTimestamp) {
						latestTimestamp = timestamp;
						latestSubscription = data;
						latestKey = childSnapshot.key;
					}
				});

				if (latestSubscription) {
					const subscriptionData = latestSubscription;
					const nextBillingSchedule = subscriptionData.data.attributes.next_billing_schedule;
					const subsId = subscriptionData.data.id;
					if(subsId.includes('_subs_')){
						const subs = await cancelSubscription(subsId);
					}
					// Update the verified node
					const verifiedUpdates = {};
					verifiedUpdates[`${latestKey}/status`] = 'total_cancelled';
					await update(verifiedRef, verifiedUpdates);
					return { success: true, message: 'Subscription cancellated successfully.' };
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

	const handleUpgrade = async () => {
		alert('Upgrade plan functionality is not implemented yet.');
		closeModal();
		window.location.reload();
	};
</script>

<Modal show={showManageModal} onClose={closeModal} title="Manage Your Plan">
	<div class="flex flex-col space-y-2">
		<button
			on:click={() => handleUpgrade()}
			class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
		>
			Upgrade Plan
		</button>
		<button
			on:click={() => handleCancelSub()}
			class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
		>
			Cancel Subscription
		</button>
	</div>
</Modal>
