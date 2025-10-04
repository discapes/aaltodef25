<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let jsonInput = `{
  "resourceGroups": [
    {
      "id": 1,
      "name": "Emergency Medical Response Team",
      "items": [
        {
          "type": "resource",
          "count": 2,
          "data": {
            "id": 41,
            "name": "mock_Web Development"
          }
        },
        {
          "type": "resource",
          "count": 1,
          "data": {
            "id": 42,
            "name": "mock_Embedded Systems"
          }
        },
        {
          "type": "resource",
          "count": 3,
          "data": {
            "id": 43,
            "name": "mock_Network Administration"
          }
        }
      ]
    },
    {
      "id": 2,
      "name": "Technical Support Unit",
      "items": [
        {
          "type": "resource",
          "count": 1,
          "data": {
            "id": 44,
            "name": "mock_Database Management"
          }
        },
        {
          "type": "resource",
          "count": 2,
          "data": {
            "id": 45,
            "name": "mock_First Aid"
          }
        },
        {
          "type": "resource",
          "count": 1,
          "data": {
            "id": 46,
            "name": "mock_Nursing"
          }
        }
      ]
    }
  ]
}`;

	let response = 'Click "Test API" to see the response...';
	let responseClass = 'response';
	let isLoading = false;

	async function testAPI() {
		isLoading = true;
		responseClass = 'response loading';
		response = 'Sending request to API...';

		try {
			// Parse JSON input
			let requestBody;
			try {
				requestBody = JSON.parse(jsonInput);
			} catch (parseError) {
				throw new Error(`Invalid JSON: ${parseError.message}`);
			}

			// Make API request
			const apiResponse = await fetch('/api/location-resource-group-counts', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			const data = await apiResponse.json();

			// Display response
			responseClass = apiResponse.ok ? 'response success' : 'response error';
			response = `Status: ${apiResponse.status} ${apiResponse.statusText}\n\n${JSON.stringify(data, null, 2)}`;
		} catch (error) {
			responseClass = 'response error';
			response = `Error: ${error.message}`;
		} finally {
			isLoading = false;
		}
	}

	function formatJSON() {
		try {
			const parsed = JSON.parse(jsonInput);
			jsonInput = JSON.stringify(parsed, null, 2);
		} catch (error) {
			// Only use alert in the browser
			if (browser) {
				alert('Invalid JSON: ' + error.message);
			} else {
				console.error('Invalid JSON:', error.message);
			}
		}
	}

	function clearResponse() {
		responseClass = 'response';
		response = 'Response cleared. Click "Test API" to test again...';
	}

	onMount(() => {
		// Only format JSON on the client side
		if (browser) {
			formatJSON();
		}
	});
</script>

<svelte:head>
	<title>Location Resource Group Counts API Test</title>
</svelte:head>

<div class="container">
	<h1>🧪 Location Resource Group Counts API Test</h1>

	<div class="section">
		<label for="jsonInput">Resource Groups JSON Input:</label>
		<textarea bind:value={jsonInput} placeholder="Enter JSON here..." rows="20"></textarea>
	</div>

	<div class="section">
		<button on:click={testAPI} disabled={isLoading}>
			{isLoading ? '⏳ Testing...' : '🚀 Test API'}
		</button>
		<button on:click={formatJSON} disabled={isLoading}>✨ Format JSON</button>
		<button on:click={clearResponse} disabled={isLoading}>🗑️ Clear Response</button>
	</div>

	<div class="section">
		<label>API Response:</label>
		<div class={responseClass}>{response}</div>
	</div>
</div>

<style>
	:global(body) {
		font-family: system-ui, -apple-system, sans-serif;
		background-color: #f5f5f5;
		margin: 0;
		padding: 20px;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		background: white;
		padding: 30px;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	h1 {
		color: #333;
		margin-bottom: 20px;
	}

	.section {
		margin-bottom: 30px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #555;
	}

	textarea {
		width: 100%;
		padding: 12px;
		border: 2px solid #ddd;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 14px;
		resize: vertical;
		box-sizing: border-box;
	}

	textarea:focus {
		outline: none;
		border-color: #007acc;
	}

	button {
		background: #007acc;
		color: white;
		padding: 12px 24px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 16px;
		margin-right: 10px;
	}

	button:hover:not(:disabled) {
		background: #005999;
	}

	button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.response {
		background: #f8f8f8;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 20px;
		margin-top: 20px;
		white-space: pre-wrap;
		font-family: 'Courier New', monospace;
		font-size: 14px;
		max-height: 400px;
		overflow-y: auto;
	}

	.error {
		background: #fee;
		border-color: #fcc;
		color: #c33;
	}

	.success {
		background: #efe;
		border-color: #cfc;
		color: #363;
	}

	.loading {
		color: #666;
		font-style: italic;
	}
</style>
