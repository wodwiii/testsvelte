<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle,
		Footer
	} from '$lib/components/ui/card';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import { CircleAlert, Search, CreditCard } from 'lucide-svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import Logo from '../../../components/Logo.svelte';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';

	let userId = '';
	let init = true;
	let subscriptionFound = false;
	let fullRefund = true;
	let refundAmount = 0;
	let totalRefundAmount = 0;
	let selected = { value: '', label: '' };
	let refundPercentage = 100;
	let refundType = 'amount';
	let showSuccessAlert = false;
	// Updated to handle multiple subscriptions
	let subscriptionData = [];

	async function searchSubscription() {
		const result = await fetch(`/api/refund/searchUID?uid=${userId}`);
		//flags for alerts
		init = false;
		showSuccessAlert = false;
		if (!result.ok) {
			subscriptionFound = false;
			const errorData = await result.json();
			console.error('Error:', errorData.error);
			return;
		}
		const { subscription, transactionType } = await result.json();

		// Reset subscription data array
		subscriptionData = [];

		// If multiple entries are found, push each into subscriptionData array, this is to handle the case of upgraded subscriptions
		if (Array.isArray(subscription)) {
			subscription.forEach((sub) => {
				let subscriptionItem = {};
				if (transactionType === 'onetimesub') {
					subscriptionItem.id = sub.data.id;
					subscriptionItem.reference = sub.data.attributes.reference_number;
					subscriptionItem.amount = sub.data.attributes.payments[0].attributes.amount / 100;
					subscriptionItem.date = new Date(sub.data.attributes.paid_at * 1000).toLocaleDateString();
					subscriptionItem.payment_id = sub.data.attributes.payments[0].id;
				} else if (transactionType === 'recurring') {
					//not yet implemented
					subscriptionItem.id = sub.data.id;
					subscriptionItem.reference = sub.reference_number;
					subscriptionItem.amount = sub.data.attributes.amount / 100;
					subscriptionItem.date = new Date(
						sub.data.attributes.created_at * 1000
					).toLocaleDateString();
					subscriptionItem.payment_id = sub.data.attributes.payment_id;
				}
				subscriptionItem.transactionType = transactionType;
				subscriptionData.push(subscriptionItem);
			});
		} else {
			// Handle single subscription case, no upgrade
			let subscriptionItem = {};
			if (transactionType === 'onetimesub') {
				subscriptionItem.id = subscription.data.id;
				subscriptionItem.reference = subscription.data.attributes.reference_number;
				subscriptionItem.amount = subscription.data.attributes.payments[0].attributes.amount / 100;
				subscriptionItem.date = new Date(
					subscription.data.attributes.paid_at * 1000
				).toLocaleDateString();
				subscriptionItem.payment_id = subscription.data.attributes.payments[0].id;
			} else if (transactionType === 'recurring') {
				subscriptionItem.id = subscription.data.id;
				subscriptionItem.reference = subscription.reference_number;
				subscriptionItem.amount = subscription.data.attributes.amount / 100;
				subscriptionItem.date = new Date(
					subscription.data.attributes.created_at * 1000
				).toLocaleDateString();
				subscriptionItem.payment_id = subscription.data.attributes.payment_id;
			}
			subscriptionItem.transactionType = transactionType;
			subscriptionData.push(subscriptionItem);
		}

		// If there are subscriptions found
		if (subscriptionData.length > 0) {
			subscriptionFound = true;
			// Calculate total refund amount by summing all amounts in subscriptionData
			totalRefundAmount = subscriptionData.reduce((total, sub) => total + sub.amount, 0);
			refundAmount = totalRefundAmount;
			refundPercentage = 100;
		}
	}

	async function handleRefund() {
		// Calculate final refund amount based on type (amount or percentage)
		const finalRefundAmount =
			refundType === 'amount' ? Number(refundAmount) : (refundPercentage / 100) * totalRefundAmount;

		// Dynamically divide the refund amount based on each transaction's amount
		const refundAmounts = subscriptionData.map(
			(sub) => (sub.amount / totalRefundAmount) * finalRefundAmount
		);

		// Refund reason (from your selected value)
		const refundReason = selected.value;

		// Loop through subscriptionData and make refund requests for each subscription
		for (let i = 0; i < subscriptionData.length; i++) {
			const sub = subscriptionData[i];

			// Define refund payload for the current subscription
			const refundPayload = {
				uid: userId,
				payment_id: sub.payment_id,
				reference_number: sub.reference,
				amount: refundAmounts[i], // Use proportional amount for each transaction
				reason: refundReason,
				transaction_type: sub.transactionType
			};
			console.log('🚀 ~ handleRefund ~ refundPayload:', refundPayload);
			try {
				const response = await fetch('/api/refund/refundTransaction', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(refundPayload)
				});

				if (!response.ok) {
					const errorData = await response.json();
					alert(`Refund failed for subscription ${sub.id}: ${errorData.error}`);
					console.error('Error processing refund:', errorData.error);
				} else {
					subscriptionFound = false;
					subscriptionData = [];
					init = true;
					showSuccessAlert = true;
					console.log(`Refund processed successfully for subscription ${sub.id}`);
				}
			} catch (error) {
				console.error('Error processing refund2:', error);
			}
		}
	}

	//if toggling between amount and percentage, make values reactive
	$: if (refundType === 'percentage') {
		refundAmount = Number(((refundPercentage / 100) * totalRefundAmount).toFixed());
	} else {
		refundPercentage = Number(((refundAmount / totalRefundAmount) * 100).toFixed(2));
	}
	//if toggling between full refund, reset values
	$: if (fullRefund){
		refundAmount = totalRefundAmount;
		refundPercentage = 100;
	}
</script>

<div class="min-h-screen max-h-screen content-center">
	<div class="flex justify-center">
		<Logo />
	</div>
	<div class="max-w-3xl min-w-[50vw] container p-4">
		<Card class="shadow-lg bg-transparent">
			<CardHeader class="bg-[#fe0000] text-white rounded-t-lg">
				<CardTitle class="text-2xl font-bold flex items-center">
					<CreditCard class="mr-2 h-6 w-6" />
					Admin Refund Portal
				</CardTitle>
				<CardDescription class="text-white/80">Manage subscription refunds</CardDescription>
			</CardHeader>
			<ScrollArea class="h-[400px] py-2">
				<CardContent class="p-6 space-y-6">
					<div class="flex items-end space-x-2">
						<div class="flex-1">
							<Label for="userId" class="text-sm font-medium text-gray-700">User ID</Label>
							<Input id="userId" bind:value={userId} placeholder="Enter user ID" class="mt-1 border-2 bg-transparent" />
						</div>
						<Button
							on:click={searchSubscription}
							class="bg-[#fe0000] hover:bg-[#fe0000]/90 text-white"
						>
							<Search class="mr-2 h-4 w-4" />
							Search
						</Button>
					</div>

					{#if subscriptionFound}
						<div class="mt-6 space-y-6">
							{#each subscriptionData as sub, index}
								<div class="bg-transparent divide-y p-4 rounded-lg mb-4">
									<h3 class="text-lg font-semibold text-gray-800 mb-2">
										Subscription Details
										{#if subscriptionData.length > 1 && index === 0}
											<span class="text-sm font-light text-gray-500">(Upgraded Plan)</span>
										{/if}
										{#if subscriptionData.length > 1 && index === 1}
											<span class="text-sm font-light text-gray-500">(Original Plan)</span>
										{/if}
									</h3>
									<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
										<p class="truncate">
											<span class="font-medium">ID:</span>
											{sub.id}
										</p>
										<p class="truncate">
											<span class="font-medium">Reference:</span>
											{sub.reference}
										</p>
										<p>
											<span class="font-medium">Amount:</span> ₱{sub.amount}
										</p>
										<p>
											<span class="font-medium">Date:</span>
											{sub.date}
										</p>
										<p class="truncate">
											<span class="font-medium">Payment ID: </span>
											{sub.payment_id}
										</p>
									</div>
								</div>
							{/each}

							<Separator />

							<div class="space-y-4">
								<div class="flex items-center space-x-2">
									<Label for="fullRefund" class="font-medium">Full Refund</Label>
									<Switch id="fullRefund" bind:checked={fullRefund} />
								</div>
								{#if !fullRefund}
									<RadioGroup bind:value={refundType} class="flex space-x-4">
										<div class="flex items-center space-x-2">
											<RadioGroupItem value="amount" id="amount" />
											<Label for="amount">Amount</Label>
										</div>
										<div class="flex items-center space-x-2">
											<RadioGroupItem value="percentage" id="percentage" />
											<Label for="percentage">Percentage</Label>
										</div>
									</RadioGroup>
									<div>
										<Label for="refundInput" class="text-sm font-medium text-gray-700">
											Refund {refundType === 'amount' ? 'Amount' : 'Percentage'}
										</Label>
										{#if refundType === 'amount'}
											<Input
												id="refundInput"
												type="number"
												bind:value={refundAmount}
												min="0"
												max={totalRefundAmount}
												step="1"
												class="mt-1 bg-transparent"
											/>
										{:else}
										<div class="relative mt-1">
											<Input
												id="refundInput"
												type="number"
												bind:value={refundPercentage}
												min="0"
												max="100"
												step="1"
												class="pr-8 bg-transparent"
											/>
											<span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">%</span>
										</div>
											
										{/if}
									</div>
									{#if refundType === 'percentage'}
										<p class="text-sm text-gray-600">
											Refund amount: ₱{((refundPercentage / 100) * totalRefundAmount).toFixed(2)}
										</p>
									{/if}
								{/if}
								<div>
									<Label for="refundNote" class="text-sm font-medium text-gray-700"
										>Refund Reason</Label
									>
									<Select  portal={null} bind:selected>
										<SelectTrigger class="mt-1 bg-transparent">
											<SelectValue placeholder="Select a reason" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="duplicate">Duplicate</SelectItem>
											<SelectItem value="fraudulent">Fraudulent</SelectItem>
											<SelectItem value="requested_by_customer">Requested by Customer</SelectItem>
											<SelectItem value="others">Others</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					{:else if !subscriptionFound && !init}
						<Alert variant="destructive" class="mt-4">
							<CircleAlert class="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>No subscription found for the given User ID.</AlertDescription>
						</Alert>
					{/if}
					{#if showSuccessAlert}
						<Alert variant="default" class="mt-4 bg-green-100 border-green-400">
							<CircleAlert class="h-4 w-4 text-green-600" />
							<AlertTitle class="text-green-800">Success</AlertTitle>
							<AlertDescription class="text-green-700"
								>Refund processed successfully.</AlertDescription
							>
						</Alert>
					{/if}

					{#if subscriptionFound}
						<CardFooter class="rounded-b-lg">
							<Button
								on:click={handleRefund}
								class="w-full bg-[#fe0000] hover:bg-[#fe0000]/90 text-white font-semibold py-2"
							>
								Process Refund
							</Button>
						</CardFooter>
					{/if}
				</CardContent>
			</ScrollArea>
		</Card>
	</div>
	<div class="block text-sm text-gray-500 dark:text-gray-400 text-center items-center justify-center">
		<a href="https://www.jur.ph" class="hover:underline font-bold">Jur.ph</a> | AI-powered legal research platform
	</div>
</div>

