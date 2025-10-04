<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import ResourceGroupForm from './ResourceGroupForm.svelte';
	import type { CreateResourceGroup } from '$lib/server/db/types';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	export let data: PageData;

	let resourceGroup: CreateResourceGroup = {
		name: '',
		description: '',
		items: []
	};

	// Check for generated resource group data from capabilities page
	onMount(() => {
		if (browser) {
			const storedData = sessionStorage.getItem('generatedResourceGroup');
			if (storedData) {
				try {
					const parsedData = JSON.parse(storedData);
					resourceGroup = parsedData;
					// Clear the stored data after using it
					sessionStorage.removeItem('generatedResourceGroup');
				} catch (e) {
					console.error('Failed to parse stored resource group data:', e);
				}
			}
		}
	});

	async function handleSubmit() {
		try {
			const response = await fetch('/api/resource-groups', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(resourceGroup)
			});

			if (response.ok) {
				alert('Resource group created successfully!');
				// Reset form
				resourceGroup = {
					name: '',
					description: '',
					items: []
				};
			} else {
				const error = await response.text();
				alert('Error creating resource group: ' + error);
			}
		} catch (error) {
			alert('Network error: ' + error);
		}
	}
</script>

<div class="container mx-auto max-w-4xl p-6">
	<Card>
		<CardHeader>
			<CardTitle>Create New Resource Group</CardTitle>
		</CardHeader>
		<CardContent class="space-y-6">
			<div class="space-y-2">
				<Label for="name">Name *</Label>
				<Input
					id="name"
					type="text"
					bind:value={resourceGroup.name}
					placeholder="Enter resource group name"
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={resourceGroup.description}
					placeholder="Enter description (optional)"
				/>
			</div>

			<ResourceGroupForm
				bind:items={resourceGroup.items}
				availableCategories={data.categories}
				existingResourceGroups={data.existingResourceGroups}
			/>

			<Button onclick={handleSubmit} class="w-full" disabled={!resourceGroup.name.trim()}>
				Create Resource Group
			</Button>
		</CardContent>
	</Card>
</div>
