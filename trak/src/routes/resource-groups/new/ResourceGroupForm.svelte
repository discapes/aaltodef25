<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import type { Category } from '$lib/server/db/types';

	let {
		items = $bindable([]),
		availableCategories,
		existingResourceGroups = []
	}: {
		items: Array<{
			type: 'resource' | 'group' | 'existing-group';
			count: number;
			data: Category | any;
		}>;
		availableCategories: Category[];
		existingResourceGroups: Array<{
			id: number;
			name: string;
			description?: string;
		}>;
	} = $props();

	function addResourceItem() {
		// Ensure we have a valid category with proper id
		const defaultCategory =
			availableCategories.length > 0
				? availableCategories[0]
				: { id: -1, name: 'No categories available', description: null };

		items = [
			...items,
			{
				type: 'resource',
				count: 1,
				data: defaultCategory
			}
		];
	}

	function addGroupItem() {
		items = [
			...items,
			{
				type: 'group',
				count: 0,
				data: {
					id: -1, // Temporary ID for new groups
					name: '',
					description: '',
					items: []
				}
			}
		];
	}

	function addExistingGroupItem() {
		const newIndex = items.length;
		// Ensure we have a valid existing group with proper id
		const defaultGroup =
			existingResourceGroups.length > 0
				? existingResourceGroups[0]
				: { id: -1, name: 'No groups available', description: '' };

		items = [
			...items,
			{
				type: 'existing-group',
				count: 1,
				data: defaultGroup
			}
		];
		// Initialize autocomplete state for the new item with empty string
		autocompleteInputs[newIndex] = '';
		filteredGroups[newIndex] = [];
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
		// Clean up autocomplete state for removed item and reindex remaining items
		const newAutocompleteInputs: { [key: number]: string } = {};
		const newFilteredGroups: { [key: number]: typeof existingResourceGroups } = {};

		let newIndex = 0;
		for (let i = 0; i < items.length + 1; i++) {
			if (i !== index && autocompleteInputs[i] !== undefined) {
				newAutocompleteInputs[newIndex] = autocompleteInputs[i];
				newFilteredGroups[newIndex] = filteredGroups[i] || [];
				newIndex++;
			}
		}

		autocompleteInputs = newAutocompleteInputs;
		filteredGroups = newFilteredGroups;
	}

	function updateResourceCategory(index: number, categoryId: string) {
		const category = availableCategories.find((c) => c.id === parseInt(categoryId));
		if (category) {
			// Create a new array to trigger reactivity
			items = items.map((item, i) => (i === index ? { ...item, data: category } : item));
		}
	}

	function updateExistingGroup(index: number, groupId: string) {
		const group = existingResourceGroups.find((g) => g.id === parseInt(groupId));
		if (group) {
			// Create a new array to trigger reactivity
			items = items.map((item, i) => (i === index ? { ...item, data: group } : item));
		}
	}

	// Autocomplete functionality - using $state() for proper reactivity
	let autocompleteInputs = $state<{ [key: number]: string }>({});
	let filteredGroups = $state<{ [key: number]: typeof existingResourceGroups }>({});

	function filterGroups(index: number, searchTerm: string) {
		autocompleteInputs[index] = searchTerm;
		if (searchTerm.trim() === '') {
			filteredGroups[index] = existingResourceGroups;
		} else {
			filteredGroups[index] = existingResourceGroups.filter(
				(group) =>
					group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					(group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
			);
		}
	}

	function selectGroup(index: number, group: (typeof existingResourceGroups)[0]) {
		// Update input value first to prevent reset
		autocompleteInputs[index] = group.name;
		filteredGroups[index] = [];

		// Create a new array to trigger reactivity and set the selected group
		items = items.map((item, i) => (i === index ? { ...item, data: group } : item));

		// Fetch the complete resource group data for display purposes
		fetchAndPopulateResourceGroup(group.id, index);
	}

	async function fetchAndPopulateResourceGroup(groupId: number, itemIndex: number) {
		try {
			const response = await fetch(`/api/resource-groups/${groupId}`);
			if (response.ok) {
				const completeGroup = await response.json();

				// Update the item with the complete resource group structure for display
				const currentInputValue = autocompleteInputs[itemIndex];
				
				items = items.map((item, i) => {
					if (i === itemIndex && item.type === 'existing-group') {
						return {
							...item,
							data: {
								...item.data,
								items: completeGroup.items, // Add the items from the database for display
								completeStructure: completeGroup // Store complete structure for reference
							}
						};
					}
					return item;
				});

				// Ensure the input value is preserved
				if (currentInputValue !== undefined) {
					autocompleteInputs[itemIndex] = currentInputValue;
				}
			} else {
				console.error('Failed to fetch resource group details');
			}
		} catch (error) {
			console.error('Error fetching resource group:', error);
		}
	}	function closeAutocomplete(index: number) {
		// Small delay to allow click events to fire first
		setTimeout(() => {
			filteredGroups[index] = [];
		}, 150);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-base font-semibold">Items in Resource Group</h3>
		<div class="space-x-1">
			<Button variant="outline" size="sm" onclick={addResourceItem}>Add Resource</Button>
			<Button variant="outline" size="sm" onclick={addGroupItem}>Add Sub-Group</Button>
			<Button variant="outline" size="sm" onclick={addExistingGroupItem}>Add Existing Group</Button>
		</div>
	</div>

	{#if items.length === 0}
		<p class="text-muted-foreground py-8 text-center">
			No items added yet. Click "Add Resource" or "Add Sub-Group" to get started.
		</p>
	{:else}
		<div class="space-y-2">
			{#each items as item, index}
				<div class="rounded-md border border-gray-200 p-3">
					<div class="mb-2 flex items-center justify-between">
						<h4 class="text-sm font-medium text-gray-900">
							{item.type === 'resource'
								? 'Resource'
								: item.type === 'existing-group'
									? 'Existing Group'
									: 'Sub-Group'} #{index + 1}
						</h4>
						<Button variant="destructive" size="sm" onclick={() => removeItem(index)}>
							Remove
						</Button>
					</div>
					<div class="space-y-3">
						{#if item.type === 'resource'}
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1">
									<Select.Root
										type="single"
										onValueChange={(v) => {
											updateResourceCategory(index, v);
										}}
									>
										<Label for="category-{index}" class="text-xs font-medium">Category</Label>

										<Select.Trigger class="h-8 text-sm">{item.data.name}</Select.Trigger>
										<Select.Content>
											{#each availableCategories as category}
												<Select.Item value={category.id.toString()}>{category.name}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-1">
									<Label for="count-{index}" class="text-xs font-medium">Count</Label>
									<Input
										id="count-{index}"
										type="number"
										min="0"
										bind:value={item.count}
										placeholder="0"
										class="h-8 text-sm"
									/>
								</div>
							</div>
						{:else if item.type === 'existing-group'}
							<!-- Existing Group Selection (before conversion) -->
							<div class="grid grid-cols-2 gap-3">
								<div class="relative space-y-1">
									<Label class="text-xs font-medium">Existing Resource Group</Label>
									<Input
										bind:value={autocompleteInputs[index]}
										placeholder="Search for existing group..."
										class="h-8 text-sm"
										oninput={(e) => {
											const target = e.target as HTMLInputElement;
											filterGroups(index, target.value);
										}}
										onfocus={() => {
											if (!autocompleteInputs[index]) {
												filteredGroups[index] = existingResourceGroups;
											}
										}}
										onblur={() => closeAutocomplete(index)}
									/>
									{#if filteredGroups[index] && filteredGroups[index].length > 0}
										<div
											class="absolute z-10 max-h-32 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg"
										>
											{#each filteredGroups[index] as group}
												<button
													type="button"
													class="w-full px-2 py-1 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
													onclick={() => selectGroup(index, group)}
												>
													<div class="font-medium">{group.name}</div>
													{#if group.description}
														<div class="text-xs text-gray-500">{group.description}</div>
													{/if}
												</button>
											{/each}
										</div>
									{/if}
								</div>
								<div class="space-y-1">
									<Label class="text-xs font-medium">Count</Label>
									<Input
										type="number"
										min="0"
										bind:value={item.count}
										placeholder="0"
										class="h-8 text-sm"
									/>
								</div>
							</div>
							{#if item.data && item.data.name}
								<div class="rounded-md bg-gray-50 p-2">
									<div class="text-xs font-medium">Selected: {item.data.name}</div>
									{#if item.data.description}
										<div class="text-xs text-gray-500">{item.data.description}</div>
									{/if}

									<!-- Show the resource group contents if available -->
									{#if item.data.items && item.data.items.length > 0}
										<div class="mt-2 border-t border-gray-200 pt-2">
											<div class="mb-1 text-xs font-medium text-gray-700">
												Contents ({item.data.items.length} items):
											</div>
											<div class="space-y-1">
												{#each item.data.items as subItem}
													<div class="flex justify-between text-xs text-gray-600">
														<span>
															{#if subItem.type === 'resource'}
																📦 {subItem.data.name}
															{:else if subItem.type === 'existing-group'}
																🗂️ {subItem.data.name}
															{:else}
																📋 {subItem.data.name}
															{/if}
														</span>
														{#if subItem.count > 1}
															<span class="font-medium">×{subItem.count}</span>
														{/if}
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						{:else}
							<!-- Sub-group (including converted existing groups) -->
							<div class="space-y-3">
								<div class="grid grid-cols-2 gap-3">
									<div class="space-y-1">
										<Label class="text-xs font-medium">Sub-Group Name</Label>
										<Input
											bind:value={item.data.name}
											placeholder="Enter sub-group name"
											class="h-8 text-sm"
										/>
									</div>
									<div class="space-y-1">
										<Label class="text-xs font-medium">Count</Label>
										<Input
											type="number"
											min="0"
											bind:value={item.count}
											placeholder="0"
											class="h-8 text-sm"
										/>
									</div>
								</div>

								<div class="space-y-1">
									<Label class="text-xs font-medium">Sub-Group Description</Label>
									<Input
										bind:value={item.data.description}
										placeholder="Enter sub-group description"
										class="h-8 text-sm"
									/>
								</div>

								<Separator />

								<!-- Recursive component for nested items -->
								<div class="border-muted border-l-2 pl-4">
									<svelte:self bind:items={item.data.items} {availableCategories} />
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
