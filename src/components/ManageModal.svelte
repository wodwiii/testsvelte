<script>
// @ts-nocheck




	import Modal from './Modal.svelte';
	import { subscription } from '../store/authStore';
	import { set, get, ref, update } from 'firebase/database';
	import { database } from '$lib/firebase/firebase.client';
	export let closeModal;
	export let showManageModal;
	export let uid;
	let status;
	$: status = $subscription?.status;
	const handleCancelSub = async () => {
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
	const handleResumeSub = async () => {
		try {
			const response = await resumeSubscription(uid);
			console.log('Subscription resumed:', response);
			alert('Subscription resumed successfully!');
			closeModal();
			window.location.reload();
		} catch (error) {
			console.error('Error:', error);
			alert('An error occurred while resuming the subscription.');
		}
	};
  const resumeSubscription = async (uid) => {
    const verifiedRef = ref(database, `verified/${uid}`);
    const pendingCancellationRef = ref(database, 'pending_cancellation');

    try {
        const verifiedSnapshot = await get(verifiedRef);
        if (verifiedSnapshot.exists()) {
            let latestSubscription = null;
            let latestTimestamp = 0;
            let latestKey = null;
			verifiedSnapshot.forEach(childSnapshot => {
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
                const subsId = subscriptionData.data.id;

                // Update the verified node
                const verifiedUpdates = {};
                verifiedUpdates[`${latestKey}/status`] = 'active';
                await update(verifiedRef, verifiedUpdates);

                // Remove entry from pending_cancellation
                const pendingCancellationSnapshot = await get(pendingCancellationRef);
                if (pendingCancellationSnapshot.exists()) {
                    const pendingCancellations = pendingCancellationSnapshot.val();
                    if (pendingCancellations[subsId]) {
                        delete pendingCancellations[subsId];
                        await set(pendingCancellationRef, pendingCancellations);
                    }
                }

                return { success: true, message: 'Subscription resumed successfully' };
            } else {
                throw new Error('Subscription not found');
            }
        } else {
            throw new Error('No verified subscriptions found');
        }
    } catch (error) {
        console.error('Error resuming subscription:', error);
        throw error;
    }
};

  const cancelSubscription = async (uid) => {
    const verifiedRef = ref(database, `verified/${uid}`);
    const pendingCancellationRef = ref(database, 'pending_cancellation');
    
    try {
        const snapshot = await get(verifiedRef);
        if (snapshot.exists()) {
            let latestSubscription = null;
            let latestTimestamp = 0;
            let latestKey = null;
			snapshot.forEach(childSnapshot => {
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

                // Convert next_billing_schedule to epoch
                const nextBillingEpoch = new Date(nextBillingSchedule).getTime();

                // Update the verified node
                const verifiedUpdates = {};
                verifiedUpdates[`${latestKey}/status`] = 'pending_cancelled';
                await update(verifiedRef, verifiedUpdates);

                // Create new entry in pending_cancellation
                const pendingCancellationEntry = `${nextBillingEpoch}_${uid}`;
                
                // Get the current pending_cancellation data
                const pendingCancellationSnapshot = await get(pendingCancellationRef);
                let pendingCancellations = pendingCancellationSnapshot.val() || {};
                
                pendingCancellations[subsId] = pendingCancellationEntry;

                // Update pending_cancellation in Firebase
                await update(pendingCancellationRef, pendingCancellations);

                return { success: true, message: 'Subscription cancellation pending' };
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
		alert('Upgrade plan functionality is not implemented yet.');
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
			Upgrade Plan
		</button>
		{#if status === 'active'}
			<button
				on:click={() => handleCancelSub()}
				class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
			>
				Cancel Subscription
			</button>
		{:else if status === 'pending_cancelled'}
			<button
				on:click={() => handleResumeSub()}
				class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
			>
				Resume Subscription
			</button>
		{/if}
	</div>
</Modal>
