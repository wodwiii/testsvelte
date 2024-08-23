<script>
    export let show = false;
    export let onClose;
    export let title;
</script>

{#if show}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center ">
        <div class="bg-white p-8 rounded-lg max-w-lg max-h-[90vh] overflow-y-auto w-full shadow-lg ">
            <h2 class="text-xl font-bold mb-4">{title}</h2>
            <slot></slot>
            <button on:click={onClose} class="mt-6 text-gray-500 hover:underline">Cancel</button>
        </div>
    </div>
{/if}