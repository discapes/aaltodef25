<script lang="ts">
	import { Map, TileLayer, Marker, Popup } from 'sveaflet';
	import { onMount } from 'svelte';
	import { divIcon } from 'leaflet';
	import { Toggle } from '$lib/components/ui/toggle';

	interface Resource {
		id: number;
		name: string;
		description?: string | null;
		locationId: number;
		latitude: number;
		longitude: number;
		createdAt: Date | null;
		updatedAt: Date | null;
		categoryId?: number | null;
		categoryName?: string | null;
	}

	interface Category {
		id: number;
		name: string;
		description?: string | null;
		createdAt: Date | null;
		updatedAt: Date | null;
	}

	let allResources: Resource[] = [];
	let filteredResources: Resource[] = [];
	let categories: Category[] = [];
	let selectedCategoryIds: number[] = [];

	// Color palette for categories
	const categoryColors = [
		'#ef4444', // red
		'#3b82f6', // blue
		'#10b981', // emerald
		'#f59e0b', // amber
		'#8b5cf6', // violet
		'#ec4899', // pink
		'#06b6d4', // cyan
		'#84cc16', // lime
		'#f97316', // orange
		'#6366f1' // indigo
	];

	function getCategoryColor(categoryId: number | null | undefined): string {
		if (!categoryId) return '#6b7280'; // gray for uncategorized
		return categoryColors[(categoryId - 1) % categoryColors.length];
	}

	function createColoredIcon(categoryId: number | null | undefined) {
		const color = getCategoryColor(categoryId);
		return `<div style="
			width: 20px;
			height: 20px;
			border-radius: 50%;
			background-color: ${color};
			border: 2px solid white;
			box-shadow: 0 2px 4px rgba(0,0,0,0.3);
		"></div>`;
	}

	async function loadResources() {
		try {
			const response = await fetch('/api/resources');
			if (response.ok) {
				allResources = await response.json();
				filterResources();
			} else {
				console.error('Failed to load resources');
			}
		} catch (error) {
			console.error('Error loading resources:', error);
		}
	}

	function filterResources() {
		if (selectedCategoryIds.length === 0) {
			filteredResources = allResources;
		} else {
			filteredResources = allResources.filter(resource => 
				resource.categoryId && selectedCategoryIds.includes(resource.categoryId)
			);
		}
	}

	async function loadCategories() {
		try {
			const response = await fetch('/api/categories');
			if (response.ok) {
				categories = await response.json();
			} else {
				console.error('Failed to load categories');
			}
		} catch (error) {
			console.error('Error loading categories:', error);
		}
	}

	function toggleCategory(categoryId: number) {
		if (selectedCategoryIds.includes(categoryId)) {
			selectedCategoryIds = selectedCategoryIds.filter((id) => id !== categoryId);
		} else {
			selectedCategoryIds = [...selectedCategoryIds, categoryId];
		}
		filterResources();
	}

	function selectAllCategories() {
		selectedCategoryIds = categories.map((cat) => cat.id);
		filterResources();
	}

	function clearAllCategories() {
		selectedCategoryIds = [];
		filterResources();
	}

	function toggleAllCategories() {
		if (selectedCategoryIds.length === categories.length) {
			clearAllCategories();
		} else {
			selectAllCategories();
		}
	}

	onMount(() => {
		loadCategories();
		loadResources();
	});
</script>

<div
	class="flex h-auto w-full flex-col overflow-hidden rounded-lg border border-gray-300 md:h-[500px] md:flex-row"
>
	<!-- Side Panel -->
	<div
		class="flex max-h-80 w-full flex-col overflow-hidden border-r border-gray-300 bg-gray-50 md:max-h-none md:w-80"
	>
		<div
			class="flex w-full flex-col border-r border-gray-300 bg-gray-50 py-3 md:w-80"
		>
		<p class="text-2xl ml-5">
			Filter by categories
		</p>
		</div>

		<div class="flex-1 overflow-y-auto py-2">
			{#each categories as category}
				<label
					class="block cursor-pointer border-b border-gray-100 px-4 py-2 transition-colors hover:bg-gray-200"
				>
					<div class="flex items-center">
						<input
							type="checkbox"
							class="mr-2 cursor-pointer"
							checked={selectedCategoryIds.includes(category.id)}
							on:change={() => toggleCategory(category.id)}
						/>
						<div
							class="mr-2 h-4 w-4 flex-shrink-0 rounded-full border-2 border-white shadow-sm"
							style="background-color: {getCategoryColor(category.id)}"
						></div>
						<div class="flex-1">
							<span class="font-medium text-gray-900">{category.name}</span>
							{#if category.description}
								<span class="mt-0.5 block text-sm text-gray-600">{category.description}</span>
							{/if}
						</div>
					</div>
				</label>
			{/each}
		</div>

		<div class="border-t border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-600">
			{filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''} shown
		</div>
	</div>

	<!-- Map -->
	<div class="relative h-96 flex-1 md:h-auto">
		<Map
			options={{
				center: [60.1699, 24.9384],
				zoom: 13
			}}
		>
			<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
			{#each filteredResources as resource (resource.id.toString() + resource.categoryId)}
				<Marker
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
					<Popup>
						<h3>{resource.name}</h3>
						{#if resource.categoryName}
							<p class="text-sm font-medium text-gray-600">Category: {resource.categoryName}</p>
						{/if}
						{#if resource.description}
							<p>{resource.description}</p>
						{/if}
					</Popup>
				</Marker>
			{/each}
		</Map>
	</div>
</div>

<style>
	:global(.custom-marker) {
		background: transparent !important;
		border: none !important;
	}
</style>
