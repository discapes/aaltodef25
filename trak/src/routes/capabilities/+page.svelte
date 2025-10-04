<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";

	let capabilityText = '';

	function handleSubmit() {
		console.log('Submitted capability:', capabilityText);
		// TODO: Add actual form submission logic
		alert(`Capability submitted: ${capabilityText}`);
		capabilityText = ''; // Clear the form after submission
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
					placeholder=""
					rows="4"
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
					required
				></textarea>
			</div>
			
			<div class="flex justify-end">
				<Button
					type="submit"
					disabled={!capabilityText.trim()}
				>
					Submit Capability
				</Button>
			</div>
		</form>
	</div>
</div>