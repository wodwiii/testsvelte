<script>
// @ts-nocheck

	import {
		createCustomer,
		createSubscription,
		createPaymentMethod,
		attachPaymentMethod
	} from '$lib/api-call';
	import Modal from './Modal.svelte';

    import {authStore} from '../store/authStore'
	import {planParams} from '../store/paymentStore';
	import { onMount, onDestroy } from 'svelte';
	import { storeFirebase } from '$lib/firebase/subscription';
	export let showPaymentModal = false;
	export let closeModal;
	let firstName = 'Rod';
	let lastName = 'Barien';
	let phoneNumber = '+639123456789';
	let email;
	let billingAddress1 = 'San Nicolas';
	let billingAddress2 = '';
	let city = 'Makati City';
	let state = 'Metro Manila';
	let postalCode = '1208';
	let country = 'PH';
	let cardNumber = '4120000000000007';
	let expirationMonth = '12';
	let expirationYear = '2025';
	let cvc = '123';
	let showBillingAddress = false;
	let showCardInformation = false;
	let loading = '';
	let uid;
	let plan;
	$: plan = $planParams.plan;
	$: email = $authStore.currentUser?.email;
	$: uid = $authStore.currentUser?.uid;
	
    
	const handlePaymentSubmit = async () => {
		try {
			loading = 'Processing';
			console.log('Processing payment...');
			const customerData = {
				first_name: firstName,
				last_name: lastName,
				phone: phoneNumber,
				email: email,
				default_device: 'email'
			};

			const customerResponse = await createCustomer(customerData);

			if (customerResponse.error) {
				console.error('Customer creation failed:', customerResponse.error);
				return;
			}

			console.log('Customer created:', customerResponse.data);

			const subscriptionResponse = await createSubscription(
				customerResponse.data.id,
				plan.includes('Lite') ? 'plan_zwSb1Bkd2Jaize3weMAKxeRA' : 'plan_qL18o2GiJwAvmJr6ggfZWtyB'
			);

			if (subscriptionResponse.error) {
				console.error('Subscription creation failed:', subscriptionResponse.error);
				return;
			}
			const subscriptionData = {
				UID: uid,
				planType: subscriptionResponse.data.attributes.plan.description.includes('Lite')? 'Lite': 'Pro',
				ID: subscriptionResponse.data.id,
				data: subscriptionResponse.data
			}
			await storeFirebase(subscriptionData);
			console.log('Subscription created:', subscriptionResponse.data);

			const paymentMethodData = {
				data: {
					attributes: {
						details: {
							card_number: cardNumber,
							exp_month: parseInt(expirationMonth),
							exp_year: parseInt(expirationYear),
							cvc: cvc
						},
						billing: {
							address: {
								line1: billingAddress1,
								city: city,
								state: state,
								postal_code: postalCode,
								country: country
							},
							name: `${firstName} ${lastName}`,
							email: email,
							phone: phoneNumber
						},
						type: 'card'
					}
				}
			};

			const paymentMethodResponse = await createPaymentMethod(paymentMethodData);

			if (paymentMethodResponse.error) {
				console.error('Payment method creation failed:', paymentMethodResponse.error);
				return;
			}

			console.log('Payment method created:', paymentMethodResponse.data);

			const paymentIntent = subscriptionResponse.data.attributes.latest_invoice.payment_intent.id;

			const attachPaymentMethodResponse = await attachPaymentMethod(
				paymentIntent,
				paymentMethodResponse.data.id
			);

			if (attachPaymentMethodResponse.error) {
				console.error('Failed to attach payment method:', attachPaymentMethodResponse.error);
				return;
			}

			console.log('Payment method attached:', attachPaymentMethodResponse.data);

			if (attachPaymentMethodResponse.data.attributes.next_action) {
				window.location.href = attachPaymentMethodResponse.data.attributes.next_action.redirect.url;
			} else {
				console.error('No redirect URL available for payment.');
			}
			closeModal();
		} catch (error) {
			console.error('Error during payment submission:', error);
		} finally {
			loading = '';
		}
	};
</script>

<Modal show={showPaymentModal} onClose={closeModal} title="Enter Payment Details">
	<form on:submit|preventDefault={handlePaymentSubmit}>
		<!-- Personal Information -->
		<div class="mb-4">
			<label class="block text-gray-700"
				>First Name
				<input type="text" class="mt-1 p-2 border rounded w-full" bind:value={firstName} required />
			</label>
		</div>
		<div class="mb-4">
			<label class="block text-gray-700"
				>Last Name
				<input type="text" class="mt-1 p-2 border rounded w-full" bind:value={lastName} required />
			</label>
		</div>
		<div class="mb-4">
			<label class="block text-gray-700"
				>Email
				<input type="text" class="mt-1 p-2 border rounded w-full"  bind:value={email} required/>
			</label>
		</div>
		<div class="mb-4">
			<label class="block text-gray-700"
				>Phone Number
				<input
					type="text"
					class="mt-1 p-2 border rounded w-full"
					bind:value={phoneNumber}
					required
				/>
			</label>
		</div>

		<!-- Collapsible Billing Address -->
		<div class="mb-4">
			<button
				type="button"
				on:click={() => (showBillingAddress = !showBillingAddress)}
				class="text-[#fe0000] hover:underline"
			>
				{showBillingAddress ? '' : '+'} Billing Address
			</button>
			{#if showBillingAddress}
				<div class="mt-4 space-y-2">
					<label class="block text-gray-700"
						>Billing Address Line 1
						<input
							type="text"
							class="mt-1 p-2 border rounded w-full"
							bind:value={billingAddress1}
							required
						/>
					</label>
					<label class="block text-gray-700"
						>Billing Address Line 2
						<input
							type="text"
							class="mt-1 p-2 border rounded w-full"
							bind:value={billingAddress2}
						/>
					</label>
					<label class="block text-gray-700"
						>City
						<input type="text" class="mt-1 p-2 border rounded w-full" bind:value={city} required />
					</label>
					<label class="block text-gray-700"
						>State
						<input type="text" class="mt-1 p-2 border rounded w-full" bind:value={state} required />
					</label>
					<label class="block text-gray-700"
						>Postal Code
						<input
							type="text"
							class="mt-1 p-2 border rounded w-full"
							bind:value={postalCode}
							required
						/>
					</label>
					<label class="block text-gray-700"
						>Country
						<input
							type="text"
							class="mt-1 p-2 border rounded w-full"
							bind:value={country}
							required
						/>
					</label>
				</div>
			{/if}
		</div>

		<!-- Collapsible Card Information -->
		<div class="mb-4">
			<button
				type="button"
				on:click={() => (showCardInformation = !showCardInformation)}
				class="text-[#fe0000] hover:underline"
			>
				{showCardInformation ? '' : '+'} Card Information
			</button>
			{#if showCardInformation}
				<div class="mt-4 space-y-2">
					<label class="block text-gray-700"
						>Card Number
						<input
							type="text"
							class="mt-1 p-2 border rounded w-full"
							bind:value={cardNumber}
							required
						/>
					</label>
					<div class="flex space-x-4">
						<div class="w-1/2">
							<label class="block text-gray-700"
								>Expiration Month
								<input
									type="text"
									class="mt-1 p-2 border rounded w-full"
									bind:value={expirationMonth}
									required
								/>
							</label>
						</div>
						<div class="w-1/2">
							<label class="block text-gray-700"
								>Expiration Year
								<input
									type="text"
									class="mt-1 p-2 border rounded w-full"
									bind:value={expirationYear}
									required
								/>
							</label>
						</div>
					</div>
					<label class="block text-gray-700"
						>CVC
						<input type="text" class="mt-1 p-2 border rounded w-full" bind:value={cvc} required />
					</label>
				</div>
			{/if}
		</div>

		<button type="submit" class="bg-blue-500 text-white p-2 rounded">
			{#if loading} {loading} {/if}
			Submit Payment
		</button>
	</form>
</Modal>
