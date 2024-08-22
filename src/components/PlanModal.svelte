<script>
	// @ts-nocheck

	export let showModal = false;
	export let closeModal;
    import{createCheckoutSession} from '../lib/paymongo/paymongo';
	let autoSubscribe = false;

	const handleUpgrade = async (plan) => {
		try {
            const paymentType = autoSubscribe ? 'Recurring' : 'One-Time';
			console.log(`Upgrading to ${plan} plan with ${paymentType} payment`);
            if(!autoSubscribe){
                const checkoutUrl = await createCheckoutSession(plan);
                window.location.href = checkoutUrl;
            }
            else{
                closeModal();
            }
		} catch (error) {
			console.log(error);
			closeModal();
		}
	};
</script>

{#if showModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
		<div class="bg-white p-8 rounded-lg max-w-lg w-full shadow-lg">
			<h2 class="text-xl font-bold mb-4">Upgrade Your Plan</h2>
			<p class="mb-4">Choose your new plan:</p>

			<div class="flex flex-col space-y-2">
				<button
					on:click={() => handleUpgrade('Lite')}
					class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
				>
					Lite
				</button>
				<button
					on:click={() => handleUpgrade('Pro')}
					class="bg-[#fe0000] text-white py-2 px-4 rounded-lg hover:bg-[#a60505]"
				>
					Pro
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
			<button on:click={closeModal} class="mt-6 text-gray-500 hover:underline">Cancel</button>
		</div>
	</div>
{/if}
