<script context='node'>
  export const data = ['this', 'could', 'be', 'from', 'a', 'database']
</script>

<script>
  import Inner from './Inner.svelte'
  export let name

  let data

  setTimeout(() => {
    data = ['and', 'this', 'could', 'be', 'an', 'update', 'from', 'the', 'server']
  }, 2000)
</script>

<h1>Hello {name}!</h1>

<p>Data: {data}</p>

<Inner />

<style>
  h1 {
    color: red;
  }
</style>