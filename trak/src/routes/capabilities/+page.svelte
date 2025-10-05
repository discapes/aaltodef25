<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ResourceGroupForm from '../resource-groups/new/ResourceGroupForm.svelte';
	import type { PageData } from './$types';
	import type {
		CapabilitiesRequest,
		CapabilitiesResponse,
		CapabilitiesError,
		CreateResourceGroup,
		Category
	} from '$lib/server/db/types';

	// Import map components directly
	import { Map, TileLayer, Marker, Popup } from 'sveaflet';
	import { divIcon } from 'leaflet';

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

	// Capabilities state
	let capabilityText = '';
	let response: CapabilitiesResponse['response'] | null = null;
	let loading = false;
	let error = '';

	// Resources and map state
	let resources: any[] = [];
	let clusteredResources: any[] = [];
	let relevantCategoryIds: number[] = [];

	// Clustering function - Simplified for better compatibility
	function clusterResources(resources: any[], radiusKm = 5) {
		if (!resources || resources.length === 0) return [];

		const clusters: any[] = [];
		const processed = new Set<number>();

		for (let i = 0; i < resources.length; i++) {
			if (processed.has(i)) continue;

			const resource = resources[i];
			const cluster = {
				id: `cluster_${i}`, // Simple incremental ID
				latitude: resource.latitude,
				longitude: resource.longitude,
				resources: [resource],
				count: 1
			};

			processed.add(i);

			// Find nearby resources (simplified distance check)
			for (let j = i + 1; j < resources.length; j++) {
				if (processed.has(j)) continue;

				const other = resources[j];
				const distance = calculateDistance(
					resource.latitude,
					resource.longitude,
					other.latitude,
					other.longitude
				);

				if (distance <= radiusKm) {
					cluster.resources.push(other);
					cluster.count = cluster.resources.length; // Simplified count
					processed.add(j);
				}
			}

			clusters.push(cluster);
		}

		return clusters;
	}

	// Calculate distance between two coordinates in kilometers
	function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371; // Earth's radius in kilometers
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	// Location analysis state
	let locationAnalysis: any[] = [];
	let analysisLoading = false;
	let showLocationAnalysis = false;

	// Bottleneck analysis state
	let bottlenecks: Array<{
		categoryName: string;
		shortage: number;
		criticalityLevel: 'high' | 'medium' | 'low';
		color: string;
		extraPercentage: number;
		totalUsed: number;
		totalAvailable: number;
	}> = [];

	// Calculate bottlenecks from location analysis
	function calculateBottlenecks() {
		if (!locationAnalysis || locationAnalysis.length === 0) {
			bottlenecks = [];
			return;
		}

		const categoryStats: Record<
			string,
			{ used: number; available: number; percentages: number[] }
		> = {};

		// Collect usage and availability data for each category across all locations
		locationAnalysis.forEach((location) => {
			location.resourceGroups.forEach((rg: any) => {
				if (rg.sources) {
					rg.sources.forEach((source: any) => {
						if (!categoryStats[source.categoryName]) {
							categoryStats[source.categoryName] = { used: 0, available: 0, percentages: [] };
						}

						const used = source.unitsTransferred;
						const available = source.remainingAtLocation || 0;

						categoryStats[source.categoryName].used += used;
						categoryStats[source.categoryName].available += available;

						// Calculate percentage of extra items for this location
						if (used > 0) {
							const extraPercentage = (available / used) * 100;
							categoryStats[source.categoryName].percentages.push(extraPercentage);
						}
					});
				}
			});
		});

		// If there's only 1 category, there can't be any bottlenecks (need comparison)
		if (Object.keys(categoryStats).length <= 1) {
			bottlenecks = [];
			return;
		}

		// Calculate average extra percentage across all categories and locations
		let allPercentages: number[] = [];
		Object.values(categoryStats).forEach((stats) => {
			allPercentages = allPercentages.concat(stats.percentages);
		});

		const globalAverageExtra =
			allPercentages.length > 0
				? allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length
				: 0;

		// Calculate bottleneckness for each category
		const bottleneckList = Object.entries(categoryStats)
			.map(([categoryName, stats]) => {
				const categoryAverageExtra =
					stats.percentages.length > 0
						? stats.percentages.reduce((sum, p) => sum + p, 0) / stats.percentages.length
						: 0;

				// Bottleneckness = how far below the global average this category is
				const bottleneckness = Math.max(0, globalAverageExtra - categoryAverageExtra);

				let criticalityLevel: 'high' | 'medium' | 'low';
				let color: string;

				// Define criticality based on how far below average
				if (bottleneckness >= globalAverageExtra * 0.7) {
					// 70% or more below average
					criticalityLevel = 'high';
					color = '#ef4444'; // Red
				} else if (bottleneckness >= globalAverageExtra * 0.6) {
					// 40-70% below average
					criticalityLevel = 'medium';
					color = '#f59e0b'; // Orange
				} else if (bottleneckness > 0.5) {
					// Any amount below average
					criticalityLevel = 'low';
					color = '#eab308'; // Yellow
				} else {
					return null; // Not a bottleneck
				}

				return {
					categoryName,
					shortage: Math.round(bottleneckness),
					criticalityLevel,
					color,
					extraPercentage: Math.round(categoryAverageExtra),
					totalUsed: stats.used,
					totalAvailable: stats.available
				};
			})
			.filter((item) => item !== null)
			.sort((a, b) => b.shortage - a.shortage)
			.slice(0, 3); // Top 3

		bottlenecks = bottleneckList;
	}

	// Simplified reactive statements - less aggressive updates
	$: if (resourceGroup.items.length > 0) {
		updateRelevantResources();
	} else {
		resources = [];
		clusteredResources = [];
	}

	$: if (locationAnalysis.length > 0) {
		calculateBottlenecks();
	}

	// Simplified clustering - only update when resources array length changes
	$: if (resources.length !== clusteredResources.length) {
		clusteredResources = clusterResources(resources);
	}

	// Helper function to group sources by category and transportation time
	function groupSources(sources: any[]) {
		const grouped: Record<string, any> = {};

		sources.forEach((source) => {
			const key = `${source.categoryName}_${source.transportationTimeHours}_${source.sourceLocationName || 'local'}`;

			if (grouped[key]) {
				const existing = grouped[key];
				existing.unitsTransferred += source.unitsTransferred;
				existing.remainingAtLocation += source.remainingAtLocation || 0;
			} else {
				grouped[key] = { ...source };
			}
		});

		return Object.values(grouped);
	}

	// Calculate how many complete resource groups can be formed
	function calculateCompleteGroups(sources: any[], resourceGroupItems: any[]) {
		if (!sources || !resourceGroupItems || resourceGroupItems.length === 0) return 0;

		const groupedSources = groupSources(sources);
		
		// Create a map of available resources by category name
		const availableByCategory: Record<string, number> = {};
		groupedSources.forEach((source: any) => {
			availableByCategory[source.categoryName] = source.unitsTransferred;
		});

		// Calculate how many groups can be formed for each required resource type
		const possibleGroups: number[] = [];
		
		resourceGroupItems.forEach((item: any) => {
			if (item.type === 'resource') {
				const categoryName = item.data.name;
				const required = item.count;
				const available = availableByCategory[categoryName] || 0;
				
				if (required > 0) {
					possibleGroups.push(Math.floor(available / required));
				}
			}
		});

		// The bottleneck (minimum) determines how many complete groups can be formed
		return possibleGroups.length > 0 ? Math.min(...possibleGroups) : 0;
	}

	// Helper function to get bottleneck color for a category
	function getBottleneckColor(categoryName: string): string | null {
		const bottleneck = bottlenecks.find((b) => b.categoryName === categoryName);
		return bottleneck ? bottleneck.color : null;
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

	// API functions
	async function updateRelevantResources() {
		// Get category IDs from current resource group items
		const categoryIds = resourceGroup.items
			.filter((item) => item.type === 'resource')
			.map((item) => item.data.id)
			.filter((id) => id !== undefined);

		relevantCategoryIds = categoryIds;
		await loadRelevantResources();
	}

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
				// Manually trigger clustering for more predictable behavior
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

	// Transform items to match API schema (convert 'existing-group' to 'group')
	function transformResourceGroupItems(items: any[]): any[] {
		return items.map(item => {
			if (item.type === 'existing-group') {
				// Convert existing-group to group format
				return {
					type: 'group',
					count: item.count,
					data: {
						id: item.data.id,
						name: item.data.name,
						items: item.data.items ? transformResourceGroupItems(item.data.items) : []
					}
				};
			} else if (item.type === 'group') {
				// Recursively transform nested groups
				return {
					...item,
					data: {
						...item.data,
						items: item.data.items ? transformResourceGroupItems(item.data.items) : []
					}
				};
			} else {
				// 'resource' type - pass through unchanged
				return item;
			}
		});
	}

	async function analyzeLocationCapabilities() {
		if (!resourceGroup.items.length) return;

		analysisLoading = true;
		try {
			// Transform resourceGroup.items to match the API schema
			const transformedItems = transformResourceGroupItems(resourceGroup.items);

			const response = await fetch('/api/location-resource-group-counts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					resourceGroups: [
						{
							id: 0, // Temporary ID for analysis
							name: resourceGroup.name,
							items: transformedItems
						}
					]
				})
			});

			if (response.ok) {
				locationAnalysis = await response.json();
				// Sort by highest total number of groups (sum of all resource group counts)
				locationAnalysis.sort((a, b) => {
					const totalA = a.resourceGroups.reduce(
						(sum: number, rg: any) => sum + (rg.count || 0),
						0
					);
					const totalB = b.resourceGroups.reduce(
						(sum: number, rg: any) => sum + (rg.count || 0),
						0
					);
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
			// First, run the AI prompt if we have capability text
			if (capabilityText.trim()) {
				await handleSubmit();
				// Wait a bit for the resource group to be populated from the AI response
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Then analyze locations if we have resource groups (either from AI or manual)
			if (resourceGroup.items.length > 0) {
				await analyzeLocationCapabilities();
			}
		} catch (err) {
			console.error('Error in query with analysis:', err);
			// Make sure loading states are reset
			analysisLoading = false;
			loading = false;
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
				const newGroup = await response.json();

				// Reset form on success
				resourceGroup = { name: '', description: '', items: [] };

				// Add success feedback
				resourceGroupError = `✅ Resource group "${newGroup.name}" created successfully!`;

				// Clear success message after 3 seconds
				setTimeout(() => {
					resourceGroupError = '';
				}, 3000);

				// Load relevant resources for the manually created resource group
				await updateRelevantResources();

				// Optionally reload the page to get fresh data including new resource groups list
				// window.location.reload();
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
				class="space-y-4"
			>
				<div>
					<div class="mb-2 flex items-center justify-between">
						<label for="capability" class="block text-sm font-medium text-gray-700">
							Describe capability
						</label>
						<Button type="submit" disabled={!capabilityText.trim() || loading} size="sm">
							{loading ? 'Loading...' : 'Prompt'}
						</Button>
					</div>
					<textarea
						id="capability"
						bind:value={capabilityText}
						placeholder="Ask about AI capabilities..."
						rows="3"
						class="resize-vertical w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
						required
					></textarea>
				</div>
			</form>
			{#if error}
				<div class="mt-6 rounded-md border border-red-400 bg-red-100 p-4 text-red-700">
					Error: {error}
				</div>
			{/if}
		</div>

		<!-- Scrollable resource group section -->
		<div class="flex-1 overflow-y-auto p-4 pb-3">
			<h2 class="mb-3 text-lg font-semibold text-gray-900">Create Resource Group</h2>

			<div class="space-y-3">
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
					<div
						class="rounded-md border p-3 text-sm {resourceGroupError.startsWith('✅')
							? 'border-green-400 bg-green-100 text-green-700'
							: 'border-red-400 bg-red-100 text-red-700'}"
					>
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
					disabled={(resourceGroup.items.length === 0 && !capabilityText.trim()) || analysisLoading}
				>
					{analysisLoading ? 'Loading...' : 'Query'}
				</Button>
			</div>
		</div>
	</div>

	<!-- Center Panel - Map -->
	<div class="relative flex-1">
		<Map options={{ center: MAP_CENTER, zoom: MAP_ZOOM }}>
			<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />

			<!-- Show clustered resource markers when not in analysis mode -->
			{#if !showLocationAnalysis && clusteredResources.length > 0}
				{#each clusteredResources as cluster (cluster.id)}
					<Marker
						latLng={[cluster.latitude, cluster.longitude]}
						options={{
							icon: divIcon({
								html: createClusteredIcon(cluster.count, cluster.resources[0]?.categoryId || 0),
								className: 'custom-marker',
								iconSize: [
									Math.min(54, 24 + cluster.count * 3),
									Math.min(54, 24 + cluster.count * 3)
								],
								iconAnchor: [
									Math.min(27, 12 + cluster.count * 1.5),
									Math.min(27, 12 + cluster.count * 1.5)
								],
								popupAnchor: [0, -Math.min(27, 12 + cluster.count * 1.5)]
							})
						}}
					>
						{@const categoryBreakdown = cluster.resources.reduce((acc: any, r: any) => {
							const category = r.categoryName || 'Unknown';
							acc[category] = (acc[category] || 0) + 1;
							return acc;
						}, {})}
						<Popup>
							<div class="min-w-48 max-w-80">
								<h3 class="mb-2 font-bold">
									Resource Cluster ({cluster.count} Total)
								</h3>

								{#if Object.keys(categoryBreakdown).length > 1}
									<div class="mb-3 rounded bg-gray-50 p-2">
										{#each Object.entries(categoryBreakdown) as [category, count]}
											<div class="text-xs text-gray-600">• {category}: {count}</div>
										{/each}
									</div>
								{/if}
							</div>
						</Popup>
					</Marker>
				{/each}
			{/if}

			<!-- Show location analysis markers -->
			{#if showLocationAnalysis && locationAnalysis.length > 0}
				{#each locationAnalysis as location}
					<Marker
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
						<Popup>
							<div class="min-w-48 max-w-80">
								<h3 class="font-bold">{location.location.name}</h3>
								{#if location.resourceGroups.length > 0}
									{#each location.resourceGroups as rg}
										<div class="mt-2 space-y-1 border-b border-gray-100 pb-2 last:border-b-0">
											{#if rg.sources && rg.sources.length > 0}
												{@const groupedSources = groupSources(rg.sources)}
												{@const localUnits = groupedSources
													.filter((s: any) => s.transportationTimeHours === 0)
													.reduce((sum: number, s: any) => sum + s.unitsTransferred, 0)}
												{@const transferredUnits = groupedSources
													.filter((s: any) => s.transportationTimeHours > 0)
													.reduce((sum: number, s: any) => sum + s.unitsTransferred, 0)}
												{@const maxTransportTime = Math.max(
													...groupedSources
														.filter((s: any) => s.transportationTimeHours > 0)
														.map((s: any) => s.transportationTimeHours),
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
												{@const groupedSources = groupSources(rg.sources)}
												<div class="mt-1">
													<div class="mb-1 text-xs font-medium text-gray-700">Sources:</div>

													<!-- Local Resources -->
													{#each groupedSources.filter((s: any) => s.transportationTimeHours === 0) as source}
														{@const typedSource = source as any}
														{@const bottleneckColor = getBottleneckColor(typedSource.categoryName)}
														<div
															class="mb-1 rounded px-2 py-1 text-xs text-gray-600"
															style="background-color: {bottleneckColor
																? bottleneckColor + '20'
																: '#f0fdf4'}; border-left: 3px solid {bottleneckColor || '#10b981'}"
														>
															<div class="flex items-center justify-between">
																<span
																	class="font-medium"
																	style="color: {bottleneckColor || '#15803d'}"
																	>🏠 {typedSource.categoryName}</span
																>
																<span
																	class="font-semibold"
																	style="color: {bottleneckColor || '#166534'}"
																	>{typedSource.unitsTransferred} local</span
																>
															</div>
															{#if typedSource.remainingAtLocation !== undefined}
																<div
																	class="mt-1 text-xs"
																	style="color: {bottleneckColor || '#16a34a'}"
																>
																	{typedSource.remainingAtLocation} additional available at location
																</div>
															{/if}
														</div>
													{/each}

													<!-- Transferred Resources -->
													{#each groupedSources.filter((s: any) => s.transportationTimeHours > 0) as source}
														{@const typedSource = source as any}
														<div class="mb-1 rounded bg-blue-50 px-2 py-1 text-xs text-gray-600">
															<div class="flex items-center justify-between">
																<span class="font-medium text-blue-700"
																	>🚛 {typedSource.categoryName}</span
																>
																<span class="font-semibold text-blue-800"
																	>{typedSource.unitsTransferred} units</span
																>
															</div>
															<div class="mt-1 text-xs text-blue-600">
																From {typedSource.sourceLocationName} • {typedSource.transportationTimeHours}h
																travel
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
							</div>
						</Popup>
					</Marker>
				{/each}
			{/if}
		</Map>
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
						<!-- Locations List -->
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
															{@const groupedSources = groupSources(rg.sources)}
															{@const localUnits = groupedSources
																.filter((s: any) => s.transportationTimeHours === 0)
																.reduce((sum: number, s: any) => sum + s.unitsTransferred, 0)}
															{@const transferredUnits = groupedSources
																.filter((s: any) => s.transportationTimeHours > 0)
																.reduce((sum: number, s: any) => sum + s.unitsTransferred, 0)}
															{@const maxTransportTime = Math.max(
																...groupedSources
																	.filter((s: any) => s.transportationTimeHours > 0)
																	.map((s: any) => s.transportationTimeHours),
																0
															)}
															{@const completeGroupsLocal = calculateCompleteGroups(
																groupedSources.filter((s: any) => s.transportationTimeHours === 0),
																resourceGroup.items
															)}
															{@const completeGroupsTotal = calculateCompleteGroups(
																groupedSources,
																resourceGroup.items
															)}
															<div class="font-medium text-green-600">{completeGroupsLocal} groups available</div>
															{#if transferredUnits > 0}
																<div class="font-medium text-blue-600">
																	{completeGroupsTotal} groups in {maxTransportTime}h
																</div>
															{/if}
															{#if rg.time_to_realize}
																<div class="text-xs text-gray-500">
																	Full capacity in {rg.time_to_realize} h
																</div>
															{/if}
														{:else}
															{@const completeGroups = Math.floor(rg.count)}
															<div class="font-medium text-green-600">{completeGroups} groups available</div>
															{#if rg.time_to_realize}
																<div class="font-medium text-blue-600">
																	{rg.count} in {rg.time_to_realize} h
																</div>
															{/if}
														{/if}
													</div>

													{#if rg.sources && rg.sources.length > 0}
														{@const groupedSources = groupSources(rg.sources)}
														<div class="mt-2 border-t border-gray-100 pt-2">
															<div class="mb-1 text-xs font-medium text-gray-700">Sources:</div>

															<!-- Local Resources -->
															{#each groupedSources.filter((s: any) => s.transportationTimeHours === 0) as source}
																{@const typedSource = source as any}
																{@const bottleneckColor = getBottleneckColor(
																	typedSource.categoryName
																)}
																<div
																	class="mb-1 rounded px-2 py-1 text-xs text-gray-600"
																	style="background-color: {bottleneckColor
																		? bottleneckColor + '20'
																		: '#f0fdf4'}; border-left: 3px solid {bottleneckColor ||
																		'#10b981'}"
																>
																	<div class="flex items-center justify-between">
																		<span
																			class="font-medium"
																			style="color: {bottleneckColor || '#15803d'}"
																			>🏠 {typedSource.categoryName}</span
																		>
																		<span
																			class="font-semibold"
																			style="color: {bottleneckColor || '#166534'}"
																			>{typedSource.unitsTransferred} local</span
																		>
																	</div>
																	{#if typedSource.remainingAtLocation !== undefined}
																		<div
																			class="mt-1 text-xs"
																			style="color: {bottleneckColor || '#16a34a'}"
																		>
																			{typedSource.remainingAtLocation} additional available at location
																		</div>
																	{/if}
																</div>
															{/each}
															<!-- Transferred Resources -->
															{#each groupedSources.filter((s: any) => s.transportationTimeHours > 0) as source}
																{@const typedSource = source as any}
																<div
																	class="mb-1 rounded bg-blue-50 px-2 py-1 text-xs text-gray-600"
																>
																	<div class="flex items-center justify-between">
																		<span class="font-medium text-blue-700"
																			>🚛 {typedSource.categoryName}</span
																		>
																		<span class="font-semibold text-blue-800"
																			>{typedSource.unitsTransferred} units</span
																		>
																	</div>
																	<div class="mt-1 text-xs text-blue-600">
																		From {typedSource.sourceLocationName} • {typedSource.transportationTimeHours}h
																		travel
																	</div>
																</div>
															{/each}
														</div>
													{/if}
												</div>
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

				<!-- Fixed Bottlenecks Section at Bottom -->
				{#if bottlenecks.length > 0 && !analysisLoading && locationAnalysis.length > 0}
					<div class="flex-shrink-0 border-t border-gray-200 bg-white p-3">
						<h4 class="mb-2 text-sm font-semibold text-gray-900">🚨 Resource Bottlenecks</h4>
						<div class="space-y-2">
							{#each bottlenecks as bottleneck}
								<div
									class="flex items-center justify-between rounded p-2 text-xs"
									style="background-color: {bottleneck.color}20; border-left: 3px solid {bottleneck.color}"
								>
									<div class="flex-1">
										<div class="font-medium text-gray-800">{bottleneck.categoryName}</div>
										<div class="text-gray-600">
											{bottleneck.totalUsed} used, {bottleneck.totalAvailable} available
										</div>
									</div>
									<div
										class="ml-2 rounded px-1 py-1 text-xs font-bold text-white"
										style="background-color: {bottleneck.color}"
									>
										{bottleneck.criticalityLevel.toUpperCase()}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
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
