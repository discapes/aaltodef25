  <script lang="ts">
	import { Map, TileLayer, Marker, Popup } from 'sveaflet';
	import { onMount } from 'svelte';

	interface Resource {
		id: number;
		name: string;
		description?: string | null;
		locationId: number;
		latitude: number;
		longitude: number;
		createdAt: Date | null;
		updatedAt: Date | null;
	}

	let resources: Resource[] = [];

	async function loadResources() {
		try {
			const response = await fetch('/api/resources');
			if (response.ok) {
				resources = await response.json();
			} else {
				console.error('Failed to load resources');
			}
		} catch (error) {
			console.error('Error loading resources:', error);
		}
	}

	onMount(() => {
		loadResources();
	});
</script>

<div style="width:100%;height:500px;">
	<Map
		options={{
			center: [60.1699, 24.9384],
			zoom: 13
		}}
	>
		<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
		{#each resources as resource}
			<Marker latLng={[resource.latitude, resource.longitude]}>
				<Popup>
					<h3>{resource.name}</h3>
					{#if resource.description}
						<p>{resource.description}</p>
					{/if}
				</Popup>
			</Marker>
		{/each}
	</Map>
</div>