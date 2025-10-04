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
	let clusteredResources: any[] = [];
	let relevantCategoryIds: number[] = [];

	// Clustering function
	function clusterResources(resources: any[], radiusKm = 5) {
		if (!resources || resources.length === 0) return [];
		
		const clusters: any[] = [];
		const processed = new Set<number>();
		
		for (let i = 0; i < resources.length; i++) {
			if (processed.has(i)) continue;
			
			const resource = resources[i];
			const cluster = {
				id: `cluster_${clusters.length}`,
				latitude: resource.latitude,
				longitude: resource.longitude,
				resources: [resource],
				count: 1
			};
			
			processed.add(i);
			
			// Find nearby resources
			for (let j = i + 1; j < resources.length; j++) {
				if (processed.has(j)) continue;
				
				const other = resources[j];
				const distance = calculateDistance(
					resource.latitude, resource.longitude,
					other.latitude, other.longitude
				);
				
				if (distance <= radiusKm) {
					cluster.resources.push(other);
					cluster.count++;
					processed.add(j);
					
					// Update cluster center (centroid)
					cluster.latitude = cluster.resources.reduce((sum, r) => sum + r.latitude, 0) / cluster.resources.length;
					cluster.longitude = cluster.resources.reduce((sum, r) => sum + r.longitude, 0) / cluster.resources.length;
				}
			}
			
			clusters.push(cluster);
		}
		
		return clusters;
	}

	// Calculate distance between two coordinates in kilometers
	function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371; // Earth's radius in kilometers
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLon = (lon2 - lon1) * Math.PI / 180;
		const a = 
			Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
			Math.sin(dLon/2) * Math.sin(dLon/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		return R * c;
	}

	// Location analysis state
	let locationAnalysis: any[] = [];
	let analysisLoading = false;
	let showLocationAnalysis = false;

	// Reactive statements
	$: if (resourceGroup.items.length > 0) {
		updateRelevantResources();
	}

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

	function createColoredIcon(categoryId: number) {
		const color = CATEGORY_COLORS[categoryId % CATEGORY_COLORS.length];
		return `<div style="
			width: 20px; height: 20px; border-radius: 50%;
			background-color: ${color}; border: 2px solid white;
			box-shadow: 0 2px 4px rgba(0,0,0,0.3);
		"></div>`;
	}

	function createClusteredIcon(count: number, categoryId: number = 0) {
		const color = CATEGORY_COLORS[categoryId % CATEGORY_COLORS.length];
		const size = Math.min(50, 20 + count * 3); // Bigger dots for more resources
		const fontSize = Math.min(14, 8 + count);

		return `<div style="
			width: ${size}px; height: ${size}px; border-radius: 50%;
			background-color: ${color}; border: 3px solid white;
			box-shadow: 0 3px 6px rgba(0,0,0,0.4);
			display: flex; align-items: center; justify-content: center;
			color: white; font-weight: bold; font-size: ${fontSize}px;
		">${count}</div>`;
	}	function createLocationAnalysisIcon(location: any) {
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
	async function updateRelevantResources() {
		// Get category IDs from current resource group items
		const categoryIds = resourceGroup.items
			.filter(item => item.type === 'resource')
			.map(item => item.categoryId)
			.filter(id => id !== undefined);
		
		relevantCategoryIds = categoryIds;
		await loadRelevantResources();
	}

	async function loadRelevantResources() {
		if (relevantCategoryIds.length === 0) {
			resources = [];
			clusteredResources = [];
			return;
		}

		try {
			const url = `/api/resources?categories=${relevantCategoryIds.join(',')}`;
			const response = await fetch(url);
			if (response.ok) {
				resources = await response.json();
				clusteredResources = clusterResources(resources);
			} else {
				console.error('Failed to load resources');
				resources = [];
				clusteredResources = [];
			}
		} catch (err) {
			console.error('Error loading resources:', err);
			resources = [];
			clusteredResources = [];
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
				// Sort by highest total number of groups (sum of all resource group counts)
				locationAnalysis.sort((a, b) => {
					const totalA = a.resourceGroups.reduce((sum, rg) => sum + (rg.count || 0), 0);
					const totalB = b.resourceGroups.reduce((sum, rg) => sum + (rg.count || 0), 0);
					return totalB - totalA; // Descending order
				});
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
			// Only analyze if we have manual resource groups
			if (resourceGroup.items.length > 0) {
				await analyzeLocationCapabilities();
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
				
				// Load relevant resources for the manually created resource group
				await updateRelevantResources();
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
					type="button"
					disabled={resourceGroup.items.length === 0 || analysisLoading}
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

				<!-- Show clustered resource markers when not in analysis mode -->
				{#if !showLocationAnalysis}
					{#each clusteredResources as cluster}
						<svelte:component
							this={Marker}
							latLng={[cluster.latitude, cluster.longitude]}
							options={{
								icon: divIcon({
									html: createClusteredIcon(cluster.count, cluster.resources[0]?.categoryId || 0),
									className: 'custom-marker',
									iconSize: [Math.min(54, 24 + cluster.count * 3), Math.min(54, 24 + cluster.count * 3)],
									iconAnchor: [Math.min(27, 12 + cluster.count * 1.5), Math.min(27, 12 + cluster.count * 1.5)],
									popupAnchor: [0, -Math.min(27, 12 + cluster.count * 1.5)]
								})
							}}
						>
							<svelte:component this={Popup}>
								<div class="min-w-48 max-w-80">
									<h3 class="font-bold mb-2">Resource Cluster ({cluster.count} resources)</h3>
									<div class="space-y-2 max-h-60 overflow-y-auto">
										{#each cluster.resources as resource}
											<div class="border-b border-gray-100 pb-2 last:border-b-0">
												<h4 class="font-semibold text-sm">{resource.name}</h4>
												{#if resource.categoryName}
													<p class="text-xs text-gray-600">Category: {resource.categoryName}</p>
												{/if}
												{#if resource.description}
													<p class="text-xs text-gray-500">{resource.description}</p>
												{/if}
											</div>
										{/each}
									</div>
								</div>
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
								<div class="min-w-48 max-w-80">
									<h3 class="font-bold">{location.location.name}</h3>
									{#if location.resourceGroups.length > 0}
										{#each location.resourceGroups as rg}
											<div class="mt-2 space-y-1 border-b border-gray-100 pb-2 last:border-b-0">
												{#if rg.sources && rg.sources.length > 0}
													{@const localUnits = rg.sources
														.filter((s) => s.transportationTimeHours === 0)
														.reduce((sum, s) => sum + s.unitsTransferred, 0)}
													{@const transferredUnits = rg.sources
														.filter((s) => s.transportationTimeHours > 0)
														.reduce((sum, s) => sum + s.unitsTransferred, 0)}
													{@const maxTransportTime = Math.max(
														...rg.sources
															.filter((s) => s.transportationTimeHours > 0)
															.map((s) => s.transportationTimeHours),
														0
													)}
													<div class="flex justify-between">
														<span class="text-sm">Available now:</span>
														<span class="font-semibold text-green-600">{localUnits}</span>
													</div>
													{#if transferredUnits > 0}
														<div class="flex justify-between">
															<span class="text-sm"
																>{localUnits + transferredUnits} in {maxTransportTime}h:</span
															>
															<span class="font-semibold text-blue-600">total</span>
														</div>
													{/if}
													{#if rg.time_to_realize}
														<div class="flex justify-between">
															<span class="text-sm">Time to full capacity:</span>
															<span class="font-semibold text-blue-600">{rg.time_to_realize}h</span>
														</div>
													{/if}
												{:else}
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
												{/if}

												{#if rg.sources && rg.sources.length > 0}
													<div class="mt-1">
														<div class="mb-1 text-xs font-medium text-gray-700">Sources:</div>

														<!-- Local Resources -->
														{#each rg.sources.filter((s) => s.transportationTimeHours === 0) as source}
															<div class="mb-1 rounded bg-green-50 px-2 py-1 text-xs text-gray-600">
																<div class="flex items-center justify-between">
																	<span class="font-medium text-green-700"
																		>🏠 {source.categoryName}</span
																	>
																	<span class="font-semibold text-green-800"
																		>{source.unitsTransferred} local</span
																	>
																</div>
																{#if source.remainingAtLocation !== undefined}
																	<div class="mt-1 text-xs text-green-600">
																		{source.remainingAtLocation} additional available at location
																	</div>
																{/if}
															</div>
														{/each}

														<!-- Transferred Resources -->
														{#each rg.sources.filter((s) => s.transportationTimeHours > 0) as source}
															<div class="mb-1 rounded bg-blue-50 px-2 py-1 text-xs text-gray-600">
																<div class="flex items-center justify-between">
																	<span class="font-medium text-blue-700"
																		>🚛 {source.categoryName}</span
																	>
																	<span class="font-semibold text-blue-800"
																		>{source.unitsTransferred} units</span
																	>
																</div>
																<div class="mt-1 text-xs text-blue-600">
																	From {source.sourceLocationName} • {source.transportationTimeHours}h
																	travel
																</div>
															</div>
														{/each}
													</div>
												{/if}
											</div>
										{/each}
									{:else if location.resources && location.resources.length > 0}
										<div class="mt-2 border-t border-gray-100 pt-2">
											<div class="mb-1 text-xs font-medium text-gray-700">
												Individual resources:
											</div>
											{#each location.resources as resource}
												{#if resource.count > 0}
													<div class="flex justify-between text-xs text-gray-600">
														<span>📦 {resource.categoryName}</span>
														<span class="font-semibold">{resource.count} units</span>
													</div>
												{/if}
											{/each}
										</div>
									{:else}
										<p class="mt-1 text-sm text-gray-500">No resource groups available</p>
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
										<div class="mt-2 space-y-2">
											{#each location.resourceGroups as rg}
												<div class="rounded border border-gray-100 p-2">
													<div class="text-sm">
														{#if rg.sources && rg.sources.length > 0}
															{@const localUnits = rg.sources
																.filter((s) => s.transportationTimeHours === 0)
																.reduce((sum, s) => sum + s.unitsTransferred, 0)}
															{@const transferredUnits = rg.sources
																.filter((s) => s.transportationTimeHours > 0)
																.reduce((sum, s) => sum + s.unitsTransferred, 0)}
															{@const maxTransportTime = Math.max(
																...rg.sources
																	.filter((s) => s.transportationTimeHours > 0)
																	.map((s) => s.transportationTimeHours),
																0
															)}
															<div class="font-medium text-green-600">{localUnits} available</div>
															{#if transferredUnits > 0}
																<div class="font-medium text-blue-600">
																	{localUnits + transferredUnits} in {maxTransportTime}h
																</div>
															{/if}
															{#if rg.time_to_realize}
																<div class="text-xs text-gray-500">
																	Full capacity in {rg.time_to_realize} h
																</div>
															{/if}
														{:else}
															<div class="font-medium text-green-600">{rg.count} available</div>
															{#if rg.time_to_realize}
																<div class="font-medium text-blue-600">
																	{rg.count} in {rg.time_to_realize} h
																</div>
															{/if}
														{/if}
													</div>

													{#if rg.sources && rg.sources.length > 0}
														<div class="mt-2 border-t border-gray-100 pt-2">
															<div class="mb-1 text-xs font-medium text-gray-700">Sources:</div>

															<!-- Local Resources -->
															{#each rg.sources.filter((s) => s.transportationTimeHours === 0) as source}
																<div
																	class="mb-1 rounded bg-green-50 px-2 py-1 text-xs text-gray-600"
																>
																	<div class="flex items-center justify-between">
																		<span class="font-medium text-green-700"
																			>🏠 {source.categoryName}</span
																		>
																		<span class="font-semibold text-green-800"
																			>{source.unitsTransferred} local</span
																		>
																	</div>
																	{#if source.remainingAtLocation !== undefined}
																		<div class="mt-1 text-xs text-green-600">
																			{source.remainingAtLocation} additional available at location
																		</div>
																	{/if}
																</div>
															{/each}

															<!-- Transferred Resources -->
															{#each rg.sources.filter((s) => s.transportationTimeHours > 0) as source}
																<div
																	class="mb-1 rounded bg-blue-50 px-2 py-1 text-xs text-gray-600"
																>
																	<div class="flex items-center justify-between">
																		<span class="font-medium text-blue-700"
																			>🚛 {source.categoryName}</span
																		>
																		<span class="font-semibold text-blue-800"
																			>{source.unitsTransferred} units</span
																		>
																	</div>
																	<div class="mt-1 text-xs text-blue-600">
																		From {source.sourceLocationName} • {source.transportationTimeHours}h
																		travel
																	</div>
																</div>
															{/each}
														</div>
													{/if}
												</div>
											{/each}
										</div>
									{:else if location.resources && location.resources.length > 0}
										<div class="mt-2 border-t border-gray-100 pt-2">
											<div class="mb-1 text-xs font-medium text-gray-700">
												Individual resources available:
											</div>
											{#each location.resources as resource}
												{#if resource.count > 0}
													<div class="mb-1 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
														<div class="flex items-center justify-between">
															<span class="font-medium text-gray-700"
																>📦 {resource.categoryName}</span
															>
															<span class="font-semibold text-gray-800">{resource.count} units</span
															>
														</div>
													</div>
												{/if}
											{/each}
										</div>
									{:else}
										<p class="mt-1 text-sm text-gray-500">No resources available</p>
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
