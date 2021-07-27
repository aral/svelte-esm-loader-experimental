<script type='node'>
  export const data = ['this', 'could', 'be', 'from', 'a', 'database']
</script>

<script>
  import Inner from './Inner.svelte'
  export let name

  let data

  setTimeout(() => {
    data = ["and, this, is, an, update"]
  }, 2000)
</script>

<h1>Hello {name}!</h1>

<p>Data is {data}</p>

<Inner />
