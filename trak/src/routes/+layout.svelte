<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button/index.js';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-background">
	<header class="border-b">
		<div class="container mx-auto px-4 py-3">
			<nav class="flex items-center justify-between">
				<a href="/" class="text-lg font-semibold">TRAK</a>
				<div class="flex space-x-2">
					<Button variant="ghost" size="sm">
						<a href="/">Home</a>
					</Button>
					<Button variant="ghost" size="sm">
						<a href="/map">Map</a>
					</Button>
					<Button variant="ghost" size="sm">
						<a href="/capabilities">Capabilities</a>
					</Button>
					<Button variant="ghost" size="sm">
						<a href="/resource-groups/new">New Resource Group</a>
					</Button>
				</div>
			</nav>
		</div>
	</header>
	
	<main class="container mx-auto">
		{@render children?.()}
	</main>
</div>
