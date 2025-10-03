<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import type { Category } from '$lib/server/db/types';

	export let items: Array<{
		type: 'resource' | 'group' | 'existing-group';
		count: number;
		data: Category | any;
	}> = [];

	export let availableCategories: Category[];
	export let existingResourceGroups: Array<{
		id: number;
		name: string;
		description?: string;
	}> = [];

	function addResourceItem() {
		items = [
			...items,
			{
				type: 'resource',
				count: 0,
				data: availableCategories[0] || { id: 0, name: '', description: null }
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
					name: '',
					description: '',
					items: []
				}
			}
		];
	}

	function addExistingGroupItem() {
		const newIndex = items.length;
		items = [
			...items,
			{
				type: 'existing-group',
				count: 0,
				data: existingResourceGroups[0] || { id: 0, name: '', description: '' }
			}
		];
		// Initialize autocomplete state for the new item
		autocompleteInputs[newIndex] = '';
		filteredGroups[newIndex] = [];
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
	}

	function updateResourceCategory(index: number, categoryId: string) {
		const category = availableCategories.find((c) => c.id === parseInt(categoryId));
		if (category) {
			items[index].data = category;
		}
	}

	function updateExistingGroup(index: number, groupId: string) {
		const group = existingResourceGroups.find((g) => g.id === parseInt(groupId));
		if (group) {
			items[index].data = group;
		}
	}

	// Autocomplete functionality
	let autocompleteInputs: { [key: number]: string } = {};
	let filteredGroups: { [key: number]: typeof existingResourceGroups } = {};

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
		items[index].data = group;
		autocompleteInputs[index] = group.name;
		filteredGroups[index] = [];
	}

	function closeAutocomplete(index: number) {
		// Small delay to allow click events to fire first
		setTimeout(() => {
			filteredGroups[index] = [];
		}, 150);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold">Items in Resource Group</h3>
		<div class="space-x-2">
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
		<div class="space-y-4">
			{#each items as item, index}
				<Card>
					<CardHeader class="pb-3">
						<div class="flex items-center justify-between">
							<CardTitle class="text-base">
								{item.type === 'resource'
									? 'Resource'
									: item.type === 'existing-group'
										? 'Existing Group'
										: 'Sub-Group'} #{index + 1}
							</CardTitle>
							<Button variant="destructive" size="sm" onclick={() => removeItem(index)}>
								Remove
							</Button>
						</div>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if item.type === 'resource'}
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<Select.Root
										type="single"
										onValueChange={(v) => {
											updateResourceCategory(index, v);
										}}
									>
										<Label for="category-{index}">Category</Label>

										<Select.Trigger class="w-[180px]">{item.data.name}</Select.Trigger>
										<Select.Content>
											{#each availableCategories as category}
												<Select.Item value={category.id.toString()}>{category.name}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-2">
									<Label for="count-{index}">Count</Label>
									<Input
										id="count-{index}"
										type="number"
										min="0"
										bind:value={item.count}
										placeholder="0"
									/>
								</div>
							</div>
						{:else if item.type === 'existing-group'}
							<!-- Existing Group -->
							<div class="grid grid-cols-2 gap-4">
								<div class="relative space-y-2">
									<Label>Existing Resource Group</Label>
									<Input
										bind:value={autocompleteInputs[index]}
										placeholder="Search for existing group..."
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
											class="absolute z-10 max-h-40 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg"
										>
											{#each filteredGroups[index] as group}
												<button
													type="button"
													class="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
													onclick={() => selectGroup(index, group)}
												>
													<div class="font-medium">{group.name}</div>
													{#if group.description}
														<div class="text-sm text-gray-500">{group.description}</div>
													{/if}
												</button>
											{/each}
										</div>
									{/if}
								</div>
								<div class="space-y-2">
									<Label>Count</Label>
									<Input type="number" min="0" bind:value={item.count} placeholder="0" />
								</div>
							</div>
							{#if item.data && item.data.name}
								<div class="rounded-md bg-gray-50 p-3">
									<div class="text-sm font-medium">Selected: {item.data.name}</div>
									{#if item.data.description}
										<div class="text-xs text-gray-600">{item.data.description}</div>
									{/if}
								</div>
							{/if}
						{:else}
							<!-- Sub-group -->
							<div class="space-y-4">
								<div class="grid grid-cols-2 gap-4">
									<div class="space-y-2">
										<Label>Sub-Group Name</Label>
										<Input bind:value={item.data.name} placeholder="Enter sub-group name" />
									</div>
									<div class="space-y-2">
										<Label>Count</Label>
										<Input type="number" min="0" bind:value={item.count} placeholder="0" />
									</div>
								</div>

								<div class="space-y-2">
									<Label>Sub-Group Description</Label>
									<Input
										bind:value={item.data.description}
										placeholder="Enter description (optional)"
									/>
								</div>

								<Separator />

								<!-- Recursive component for nested items -->
								<div class="border-muted border-l-2 pl-4">
									<svelte:self bind:items={item.data.items} {availableCategories} />
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
