/**
 * inverted version of a JS WeakMap, instead of object key to any value this is any key to object value
 * when values are deallocated, the key is deleted from the map as well
 */
class InvertedWeakMap<K extends string | symbol, V extends object> {
    private map = new Map<K, WeakRef<V>>()
    private registry: FinalizationRegistry<K>
  
    constructor() {
      this.registry = new FinalizationRegistry<K>((key) => {
        this.map.delete(key)
      })
    }
  
    set(key: K, value: V) {
      this.map.set(key, new WeakRef(value))
      this.registry.register(value, key)
    }
  
    get(key: K): V | undefined {
      const ref = this.map.get(key)
      if (ref) {
        return ref.deref()
      }
    }
  
    has(key: K): boolean {
      return this.map.has(key) && this.get(key) !== undefined
    }
}