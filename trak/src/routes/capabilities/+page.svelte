<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import * as Card from "$lib/components/ui/card/index.js";
	import type { CapabilitiesRequest, CapabilitiesResponse, CapabilitiesError } from '$lib/server/db/types';

	let capabilityText = '';
	let response: { categories: string[] } | null = null;
	let loading = false;
	let error = '';

	async function handleSubmit() {
		loading = true;
		error = '';
		response = null;
		
		try {
			const requestData: CapabilitiesRequest = {
				message: capabilityText,
			};

			const res = await fetch('/api/capabilities', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestData)
			});

			const data = await res.json();

			if (res.ok) {
				const result = data as CapabilitiesResponse;
				response = result.response;
			} else {
				const errorResult = data as CapabilitiesError;
				error = errorResult.error;
			}
		} catch (err) {
			error = 'Network error occurred';
			console.error('Error:', err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto px-4 py-8 max-w-2xl">
	<div class="bg-white rounded-lg shadow-md p-6">
		<h1 class="text-3xl font-bold text-gray-900 mb-6">Capabilities</h1>
		
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div>
				<label for="capability" class="block text-sm font-medium text-gray-700 mb-2">
					Describe capability
				</label>
				<textarea
					id="capability"
					bind:value={capabilityText}
					placeholder="Ask about AI capabilities..."
					rows="4"
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
					required
				></textarea>
			</div>
			
			<div class="flex justify-end">
				<Button
					type="submit"
					disabled={!capabilityText.trim() || loading}
				>
					{loading ? 'Loading...' : 'Ask AI'}
				</Button>
			</div>
		</form>
		
		{#if error}
			<div class="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
				Error: {error}
			</div>
		{/if}
		
		{#if response}
			<div class="mt-6 space-y-4">
				<h2 class="text-lg font-semibold text-gray-900">Required Categories:</h2>
				
				{#if response.categories && response.categories.length > 0}
					<div class="grid gap-3">
						{#each response.categories as category}
							<Card.Root class="p-4">
								<Card.Content class="flex items-center p-0">
									<div class="w-3 h-3 bg-blue-500 rounded-full mr-3 flex-shrink-0"></div>
									<span class="text-gray-800 font-medium">{category}</span>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				{:else}
					<Card.Root class="p-4">
						<Card.Content class="text-center text-gray-500 p-0">
							No specific categories identified for this capability.
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		{/if}
	</div>
</div>