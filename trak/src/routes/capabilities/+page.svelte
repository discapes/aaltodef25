<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import ResourceGroupForm from '../resource-groups/new/ResourceGroupForm.svelte';
	import type { PageData } from './$types';
	import type {
		CapabilitiesRequest,
		CapabilitiesResponse,
		CapabilitiesError,
		CreateResourceGroup,
		Category
	} from '$lib/server/db/types';

	export let data: PageData;

	// Constants
	const MAP_CENTER = [60.1699, 24.9384] as const;
	const MAP_ZOOM = 13;
	const CATEGORY_COLORS = [
		'#ef4444',
		'#3b82f6',
		'#10b981',
		'#f59e0b',
		'#8b5cf6',
		'#ec4899',
		'#06b6d4',
		'#84cc16',
		'#f97316',
		'#6366f1'
	] as const;

	// Map components (loaded dynamically)
	let Map: any, TileLayer: any, Marker: any, Popup: any, divIcon: any;
	let mapComponentsLoaded = false;

	// Capabilities state
	let capabilityText = '';
	let response: CapabilitiesResponse['response'] | null = null;
	let loading = false;
	let error = '';

	// Resources and map state
	let resources: any[] = [];
	let relevantCategoryIds: number[] = [];

	// Location analysis state
	let locationAnalysis: any[] = [];
	let analysisLoading = false;
	let showLocationAnalysis = false;

	// Resource group state
	const availableCategories: Category[] = data.categories;
	const existingResourceGroups = data.existingResourceGroups;
	let resourceGroup: CreateResourceGroup = {
		name: '',
		description: '',
		items: []
	};
	let resourceGroupLoading = false;
	let resourceGroupError = '';

	// Map utilities
	function getCategoryColor(categoryId: number | null | undefined): string {
		if (!categoryId) return '#6b7280';
		return CATEGORY_COLORS[(categoryId - 1) % CATEGORY_COLORS.length];
	}

	function createColoredIcon(categoryId: number | null | undefined) {
		const color = getCategoryColor(categoryId);
		return `<div style="
			width: 20px; height: 20px; border-radius: 50%;
			background-color: ${color}; border: 2px solid white;
			box-shadow: 0 2px 4px rgba(0,0,0,0.3);
		"></div>`;
	}

	function createLocationAnalysisIcon(location: any) {
		const hasResources = location.resourceGroups.length > 0;
		const maxCount = hasResources
			? Math.max(...location.resourceGroups.map((rg: any) => rg.count))
			: 0;

		// Choose color based on availability
		let color = '#ef4444'; // red for no resources
		if (maxCount > 0) color = '#f59e0b'; // amber for some resources
		if (maxCount >= 5) color = '#10b981'; // green for good availability

		return `<div style="
			width: 35px; height: 35px; border-radius: 50%;
			background-color: ${color}; border: 3px solid white;
			box-shadow: 0 3px 6px rgba(0,0,0,0.4);
			display: flex; align-items: center; justify-content: center;
			color: white; font-weight: bold; font-size: 12px;
		">${maxCount}</div>`;
	}

	// Load map components on client side
	async function loadMapComponents() {
		if (!browser) return;

		try {
			const [sveaflet, leaflet] = await Promise.all([import('sveaflet'), import('leaflet')]);

			Map = sveaflet.Map;
			TileLayer = sveaflet.TileLayer;
			Marker = sveaflet.Marker;
			Popup = sveaflet.Popup;
			divIcon = leaflet.divIcon;

			mapComponentsLoaded = true;
		} catch (err) {
			console.error('Failed to load map components:', err);
		}
	}

	onMount(loadMapComponents);

	// API functions
	async function loadRelevantResources() {
		if (relevantCategoryIds.length === 0) {
			resources = [];
			return;
		}

		try {
			const url = `/api/resources?categories=${relevantCategoryIds.join(',')}`;
			const response = await fetch(url);
			if (response.ok) {
				resources = await response.json();
			} else {
				console.error('Failed to load resources');
				resources = [];
			}
		} catch (err) {
			console.error('Error loading resources:', err);
			resources = [];
		}
	}

	async function analyzeLocationCapabilities() {
		if (!resourceGroup.items.length) return;

		analysisLoading = true;
		try {
			const response = await fetch('/api/location-resource-group-counts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					resourceGroups: [
						{
							id: 0, // Temporary ID for analysis
							name: resourceGroup.name,
							items: resourceGroup.items
						}
					]
				})
			});

			if (response.ok) {
				locationAnalysis = await response.json();
				showLocationAnalysis = true;
			} else {
				console.error('Failed to analyze locations');
				locationAnalysis = [];
			}
		} catch (err) {
			console.error('Error analyzing locations:', err);
			locationAnalysis = [];
		} finally {
			analysisLoading = false;
		}
	}

	function getCategoryIdsByNames(categoryNames: string[]): number[] {
		return availableCategories
			.filter((category) =>
				categoryNames.some(
					(name) =>
						category.name.toLowerCase().includes(name.toLowerCase()) ||
						name.toLowerCase().includes(category.name.toLowerCase())
				)
			)
			.map((category) => category.id);
	}

	async function handleSubmit() {
		loading = true;
		error = '';
		response = null;
		resources = [];
		showLocationAnalysis = false;

		try {
			const requestData: CapabilitiesRequest = { message: capabilityText };
			const res = await fetch('/api/capabilities', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestData)
			});

			const data = await res.json();

			if (res.ok) {
				const result = data as CapabilitiesResponse;
				response = result.response;

				// Load relevant resources based on AI response
				if (response?.items?.length > 0) {
					const categoryNames = response.items.map((item) => item.categoryName);
					relevantCategoryIds = getCategoryIdsByNames(categoryNames);
					await loadRelevantResources();
				}
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

	async function handleQueryWithAnalysis() {
		try {
			// Only run location analysis if we have items in the resource group
			if (resourceGroup.items && resourceGroup.items.length > 0) {
				await analyzeLocationCapabilities();
			} else {
				console.log('No resource group items to analyze');
			}
		} catch (err) {
			console.error('Error in query with analysis:', err);
			// Make sure loading states are reset
			analysisLoading = false;
		}
	}
	async function handleResourceGroupSubmit() {
		resourceGroupLoading = true;
		resourceGroupError = '';

		try {
			const response = await fetch('/api/resource-groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(resourceGroup)
			});

			if (response.ok) {
				// Reset form on success
				resourceGroup = { name: '', description: '', items: [] };
			} else {
				const errorText = await response.text();
				resourceGroupError = 'Error creating resource group: ' + errorText;
			}
		} catch (error) {
			resourceGroupError = 'Network error: ' + error;
		} finally {
			resourceGroupLoading = false;
		}
	}

	function populateResourceGroupFromResponse() {
		if (!response) return;

		resourceGroup.name = response.name;
		resourceGroup.description = response.description || '';
		resourceGroup.items = response.items.map((item) => {
			const category = availableCategories.find((c) => c.name === item.categoryName);
			return {
				type: 'resource' as const,
				count: item.count,
				hours_needed: item.hours_needed,
				hours_to_realize: item.hours_to_realize,
				data: category || { id: 0, name: item.categoryName, description: null }
			};
		});
	}

	// Auto-populate resource group when AI response is received
	$: if (response) {
		populateResourceGroupFromResponse();
	}
</script>

<div class="fixed inset-0 top-20 flex">
	<!-- Left Sidebar - Capabilities Input -->
	<div class="flex w-1/3 flex-shrink-0 flex-col border-r border-gray-300 bg-white">
		<!-- Fixed capabilities chat section -->
		<div class="flex-shrink-0 border-b border-gray-200 p-6">
			<h1 class="mb-6 text-3xl font-bold text-gray-900">Capabilities</h1>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-6"
			>
				<div>
					<label for="capability" class="mb-2 block text-sm font-medium text-gray-700">
						Describe capability
					</label>
					<textarea
						id="capability"
						bind:value={capabilityText}
						placeholder="Ask about AI capabilities..."
						rows="4"
						class="resize-vertical w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						required
					></textarea>
				</div>

				<div class="flex justify-end">
					<Button type="submit" disabled={!capabilityText.trim() || loading}>
						{loading ? 'Loading...' : 'Prompt'}
					</Button>
				</div>
			</form>
			{#if error}
				<div class="mt-6 rounded-md border border-red-400 bg-red-100 p-4 text-red-700">
					Error: {error}
				</div>
			{/if}
		</div>

		<!-- Scrollable resource group section -->
		<div class="flex-1 overflow-y-auto p-6 pb-4">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">Create Resource Group</h2>

			<div class="space-y-4">
				<div>
					<Label for="rg-name">Name *</Label>
					<Input
						id="rg-name"
						type="text"
						bind:value={resourceGroup.name}
						placeholder="Enter resource group name"
						required
					/>
				</div>

				<div>
					<Label for="rg-description">Description</Label>
					<Input
						id="rg-description"
						bind:value={resourceGroup.description}
						placeholder="Enter description (optional)"
					/>
				</div>

				<!-- Use ResourceGroupForm component for advanced functionality -->
				<ResourceGroupForm
					bind:items={resourceGroup.items}
					{availableCategories}
					{existingResourceGroups}
				/>

				{#if resourceGroupError}
					<div class="rounded-md border border-red-400 bg-red-100 p-3 text-sm text-red-700">
						{resourceGroupError}
					</div>
				{/if}
			</div>
		</div>

		<!-- Fixed bottom action buttons -->
		<div class="flex-shrink-0 border-t border-gray-200 p-4">
			<div class="flex gap-3">
				<Button
					onclick={handleResourceGroupSubmit}
					class="flex-1"
					disabled={!resourceGroup.name.trim() || resourceGroupLoading}
				>
					{resourceGroupLoading ? 'Creating...' : 'Create Resource Group'}
				</Button>
				<Button
					onclick={handleQueryWithAnalysis}
					variant="outline"
					disabled={!resourceGroup.items.length || analysisLoading}
				>
					{analysisLoading ? 'Loading...' : 'Query'}
				</Button>
			</div>
		</div>
	</div>

	<!-- Center Panel - Map -->
	<div class="relative flex-1">
		{#if mapComponentsLoaded}
			<svelte:component this={Map} options={{ center: MAP_CENTER, zoom: MAP_ZOOM }}>
				<svelte:component this={TileLayer} url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />

				<!-- Show resource markers when not in analysis mode -->
				{#if !showLocationAnalysis}
					{#each resources as resource}
						<svelte:component
							this={Marker}
							latLng={[resource.latitude, resource.longitude]}
							options={{
								icon: divIcon({
									html: createColoredIcon(resource.categoryId),
									className: 'custom-marker',
									iconSize: [24, 24],
									iconAnchor: [12, 12],
									popupAnchor: [0, -12]
								})
							}}
						>
							<svelte:component this={Popup}>
								<h3>{resource.name}</h3>
								{#if resource.categoryName}
									<p class="text-sm font-medium text-gray-600">Category: {resource.categoryName}</p>
								{/if}
								{#if resource.description}
									<p>{resource.description}</p>
								{/if}
							</svelte:component>
						</svelte:component>
					{/each}
				{/if}

				<!-- Show location analysis markers -->
				{#if showLocationAnalysis}
					{#each locationAnalysis as location}
						<svelte:component
							this={Marker}
							latLng={[
								location.location.latitude || MAP_CENTER[0],
								location.location.longitude || MAP_CENTER[1]
							]}
							options={{
								icon: divIcon({
									html: createLocationAnalysisIcon(location),
									className: 'custom-marker',
									iconSize: [40, 40],
									iconAnchor: [20, 20],
									popupAnchor: [0, -20]
								})
							}}
						>
							<svelte:component this={Popup}>
								<div class="min-w-48">
									<h3 class="font-bold">{location.location.name}</h3>
									{#if location.resourceGroups.length > 0}
										{#each location.resourceGroups as rg}
											<div class="mt-2 space-y-1">
												<div class="flex justify-between">
													<span class="text-sm">Available now:</span>
													<span class="font-semibold text-green-600">{rg.count}</span>
												</div>
												{#if rg.time_to_realize}
													<div class="flex justify-between">
														<span class="text-sm">Time to full capacity:</span>
														<span class="font-semibold text-blue-600">{rg.time_to_realize}h</span>
													</div>
												{/if}
												{#if rg.sources && rg.sources.length > 0}
													<div class="mt-2 text-xs">
														<div class="mb-1 font-medium text-gray-600">Sources:</div>
														{#each rg.sources as source}
															<div class="flex items-center justify-between pl-1 text-gray-600">
																<div class="flex-1">
																	<div class="truncate font-medium">{source.categoryName}</div>
																	<div class="text-xs text-gray-500">
																		{#if source.transportationTimeHours > 0}
																			from {source.sourceLocationName}
																		{:else}
																			Local
																		{/if}
																	</div>
																</div>
																<div class="ml-2 text-right">
																	<div>{source.unitsTransferred}</div>
																	{#if source.transportationTimeHours > 0}
																		<div class="text-xs text-orange-600">
																			{source.transportationTimeHours}h
																		</div>
																	{:else}
																		<div class="text-xs text-green-600">Ready</div>
																	{/if}
																</div>
															</div>
														{/each}
													</div>
												{/if}
											</div>
										{/each}
									{:else}
										<p class="mt-1 text-sm text-gray-500">No resource groups available</p>
									{/if}

									<!-- Resource Summary for popup -->
									{#if location.resources && location.resources.length > 0}
										<div class="mt-2 border-t border-gray-200 pt-2">
											<div class="mb-1 text-xs font-medium text-gray-700">Available Resources</div>
											{#each location.resources.slice(0, 3) as resource}
												{#if resource.count > 0}
													<div class="flex justify-between text-xs">
														<span class="truncate">{resource.categoryName}</span>
														<span>{resource.remaining || 0}/{resource.count}</span>
													</div>
												{/if}
											{/each}
											{#if location.resources.length > 3}
												<div class="text-xs text-gray-500">
													...and {location.resources.length - 3} more
												</div>
											{/if}
										</div>
									{/if}
								</div>
							</svelte:component>
						</svelte:component>
					{/each}
				{/if}
			</svelte:component>
		{:else if browser}
			<div class="flex h-full items-center justify-center bg-gray-50">
				<div class="text-center">
					<div
						class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"
					></div>
					<p class="text-gray-600">Loading map...</p>
				</div>
			</div>
		{:else}
			<div class="flex h-full items-center justify-center bg-gray-50">
				<p class="text-gray-600">Map will load on client side</p>
			</div>
		{/if}
	</div>

	<!-- Right Panel - Location Analysis -->
	{#if showLocationAnalysis}
		<div class="w-80 flex-shrink-0 border-l border-gray-300 bg-gray-50">
			<div class="flex h-full flex-col">
				<div class="flex-shrink-0 border-b border-gray-200 bg-white p-4">
					<h3 class="text-lg font-semibold text-gray-900">Location Analysis</h3>
					<p class="text-sm text-gray-600">Resource group availability by location</p>
				</div>

				<div class="flex-1 overflow-y-auto p-4">
					{#if analysisLoading}
						<div class="flex items-center justify-center py-8">
							<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
						</div>
					{:else if locationAnalysis.length === 0}
						<p class="py-8 text-center text-sm text-gray-500">No analysis data available</p>
					{:else}
						<div class="space-y-3">
							{#each locationAnalysis as location}
								<div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
									<h4 class="font-medium text-gray-900">{location.location.name}</h4>
									{#if location.resourceGroups.length > 0}
										<div class="mt-2 space-y-1">
											{#each location.resourceGroups as rg}
												<div class="flex items-center justify-between text-sm">
													<span class="text-gray-600">Available now:</span>
													<span class="font-medium text-green-600">{rg.count} groups</span>
												</div>
												{#if rg.time_to_realize}
													<div class="flex items-center justify-between text-sm">
														<span class="text-gray-600">Full capacity:</span>
														<span class="font-medium text-blue-600">{rg.time_to_realize}h</span>
													</div>
												{/if}
												{#if rg.sources && rg.sources.length > 0}
													<div class="mt-2 text-xs">
														<div class="mb-1 font-medium text-gray-500">Resource Sources:</div>
														{#each rg.sources as source}
															<div class="flex items-center justify-between pl-2 text-gray-600">
																<div class="flex-1">
																	<div class="font-medium">{source.categoryName}</div>
																	<div class="text-gray-500">
																		{#if source.transportationTimeHours > 0}
																			from {source.sourceLocationName}
																		{:else}
																			Local supply
																		{/if}
																	</div>
																</div>
																<div class="text-right">
																	<div>{source.unitsTransferred} units</div>
																	{#if source.transportationTimeHours > 0}
																		<div class="text-orange-600">
																			{source.transportationTimeHours}h transport
																		</div>
																	{:else}
																		<div class="text-green-600">Available</div>
																	{/if}
																</div>
															</div>
														{/each}
													</div>
												{/if}
											{/each}
										</div>
									{:else}
										<p class="mt-1 text-sm text-gray-500">No resources available</p>
									{/if}

									<!-- Resource Availability Summary -->
									{#if location.resources && location.resources.length > 0}
										<div class="mt-3 border-t border-gray-200 pt-2">
											<h5 class="mb-2 text-xs font-medium text-gray-700">Resource Availability</h5>
											<div class="space-y-1">
												{#each location.resources as resource}
													{#if resource.count > 0}
														<div class="flex items-center justify-between text-xs">
															<span class="truncate text-gray-600">{resource.categoryName}</span>
															<div class="text-right">
																<div class="font-medium">
																	{resource.remaining || 0} / {resource.count} available
																</div>
																{#if resource.transferred && resource.transferred > 0}
																	<div class="text-orange-600">
																		{resource.transferred} transferred out
																	</div>
																{/if}
															</div>
														</div>
													{/if}
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(.custom-marker) {
		background: transparent !important;
		border: none !important;
	}
</style>
