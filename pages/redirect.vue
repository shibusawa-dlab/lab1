<template>
  <div></div>
</template>

<script>
export default {
  layout: 'blank',
  fetch({ base, redirect, query }) {
    const param = query.p
    if (param === undefined) {
      return redirect('/')
    }
    const redirectPath = '/' + param.replace(base, '')
    // console.log({ redirectPath })
    return redirect(redirectPath)
  },
}
</script>
