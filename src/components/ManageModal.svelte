<script>
// @ts-nocheck

    import Modal from "./Modal.svelte";
    import { cancelSubscription } from '$lib/api-call';
	import { subscription } from "../store/authStore";
    export let closeModal;
    export let showManageModal;
    export let uid;
    const handleCancelSub = async () => {
        const subscriptionData = $subscription;
        try {
            const response = await cancelSubscription(subscriptionData.subs_id, uid);
            console.log('Subscription cancelled:', response);
            alert('Subscription cancelled successfully!');
            closeModal();
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while cancelling the subscription.');
        }
    };

    const handleChangePayment = async () => {
        alert('Change payment method functionality is not implemented yet.');
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
  