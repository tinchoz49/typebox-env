import { standard } from 'eslint-config-standard-ext'

export default standard({
  typescript: {
    parserOptions: {
      warnOnUnsupportedTypeScriptVersion: false,
    },
  },
})
