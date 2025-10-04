<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
</script>

<div class="flex flex-col items-center justify-center min-h-[80vh] px-4">
	<div class="max-w-2xl mx-auto text-center space-y-8">
		<div class="space-y-4">
			<h1 class="text-4xl font-bold tracking-tight">Welcome to TRAK</h1>
			<p class="text-xl text-muted-foreground">
				Track and manage your resources and capabilities
			</p>
		</div>
		
		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<Button size="lg" class="px-8 py-4 text-lg">
				<a href="/map" class="flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 13l-6-3m6 3V4" />
					</svg>
					View Map
				</a>
			</Button>
			
			<Button variant="outline" size="lg" class="px-8 py-4 text-lg">
				<a href="/capabilities" class="flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
					Manage Capabilities
				</a>
			</Button>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 text-left">
			<div class="space-y-3">
				<h3 class="text-lg font-semibold">Map View</h3>
				<p class="text-sm text-muted-foreground">
					Visualize your resources on an interactive map. View locations, categories, and manage geographical data.
				</p>
			</div>
			
			<div class="space-y-3">
				<h3 class="text-lg font-semibold">Capabilities</h3>
				<p class="text-sm text-muted-foreground">
					Manage your capabilities and resources. Create, edit, and organize resource groups and categories.
				</p>
			</div>
		</div>
	</div>
</div>
