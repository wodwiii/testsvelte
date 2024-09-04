<script>
// @ts-nocheck

    import { createCheckoutSession } from '$lib/api-call';
	import Modal from './Modal.svelte';
    import { planParams } from '../store/paymentStore';
    import { authStore } from '../store/authStore';
    export let showModal = false;
    export let closeModal;
    export let onUpgrade;

    let autoSubscribe = false;
    let loading = '';
    let uid;
    $: uid = $authStore.currentUser?.uid;
    
    const handleUpgrade = async (plan) => {
        try {
            loading = plan;
            const paymentType = autoSubscribe ? 'Recurring' : 'One-Time';
            planParams.set({
                plan: plan,
                recurring: autoSubscribe
            })
            console.log(`Upgrading to ${plan} plan with ${paymentType} payment`);

            if (!autoSubscribe) {
                const response = await createCheckoutSession(plan, uid);
                if (response.checkout_url) {
                    window.location.href = response.checkout_url;
                }
            } else {
                onUpgrade();
            }
        } catch (error) {
            console.error('Error during upgrade:', error);
        } finally {
            loading = '';
        }
    };
</script>

<Modal show={showModal} onClose={closeModal} title="Upgrade Your Plan">
    <p class="mb-4">Choose your new plan:</p>
    <div class="flex flex-col space-y-2">
        <button
            on:click={() => handleUpgrade('Lite')}
            class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
            disabled={loading === 'Lite'}
        >
            {loading === 'Lite' ? 'Loading...' : 'Lite'}
        </button>
        <button
            on:click={() => handleUpgrade('Pro')}
            class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
            disabled={loading === 'Pro'}
        >
            {loading === 'Pro' ? 'Loading...' : 'Pro'}
        </button>
    </div>
    <div class="mt-4 flex items-center">
        <label class="inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                bind:checked={autoSubscribe}
                class="form-checkbox h-5 w-5 text-[#fe0000]"
            />
            <span class="ml-2">Auto-Subscribe (Recurring Payment)</span>
        </label>
    </div>
</Modal>