# Lab 7 Exercise Problems

Author: Daniel Zhang

> [!WARNING]
> Due: October 13rd 2026, 11:30pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-7-exercise"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Problems

In this lab, we design and implement the “EC” of ECS (Entity Component System): instead of storing collections
of game objects in an “array of structures” (AoS), we wish instead to represent the collection as a “structure
of arrays” (SoA). This means that for each *component type*, we centralize the storage of all of its
instantiations, such that iterating over a specific component type for *all objects* is cache-friendly — they
are stored essentially contiguously in memory.

We've divided this task up into 2 stages for you: first, you design the storage container used for each
individual component type. In this lab, we call this a *registry*, because each stored item gets back a *ticket*,
indicating its unique ID in the “registry”. Second, you design the entity manager itself, which will
be responsible for the connections between each game object (entity), and the instantiated components it is
made up of.

1. *Registry.* Inside `registry.h`, Design and implement a class template for a data structure,
   `Registry<T>`. Each instantiation of a `Registry<T>` is responsible for the storage of a *single component
   type `T`*, for *all entities* in the ECS.

   A `Registry<T>` works by handing out tickets (`size_t` ids). Each time you call
   `store(/* a reference to a T */)`, the registry stores the argument in the next available slot and returns
   that slot index as the ticket ID. By default, these slots go up like $0, 1, 2, ...$, until a previously
   stored object is `remove`'d. If a stored object is removed, its ticket/ID is recycled — future calls to
   `store` may receive that ticket instead of expanding the storage. A `Registry<T>` should always try to get
   rid of recycled IDs first, before expanding storage. Besides that, a registry can grow without bound.

   A registry can be accessed via `operator[](size_t)`, which takes the ticket/index returned by `store` and
   returns a reference back to the corresponding stored object.

   A registry can also check if any arbitrary ticket is valid. This means the registry must keep track of
   handed out tickets and whether they have been `remove`'d.

   **Some general hints...** you should bookkeep which specific ticket IDs have been returned back to us from
   `remove` calls (and not yet recycled) so you can find one to recycle quickly. Another hint for ticket
   validity checking is that `std::vector<bool>` is a dynamic bitset that you can use as if it actually
   stored `bool`s, but it actually uses 1 bit per entry (instead of 1 byte), making it memory efficient for
   marking whether entries are alive (and time-efficient for lookups).

   `Registry<T>` must support the following operations (we have not indicated `const`):

    - `size_t store(const T&)` and `size_t store(T&&)`, which respectively copies/moves the passed argument
      into the next available slot in the registry. Preference is given to recycled slots. Finally, the index
      the argument was stored into is returned as a `size_t`.

      This operation must take amortized $O (1)$ time.

      *Hint:* you can combine these overloads into one function template, if you remember how to do [perfect
      forwarding](../3/cpp.md#forwarding-references).

    - `void remove(size_t)`, which takes a valid/live ticket index and “removes” the object stored at that
      slot, updating any bookkeeping necessary. Destruction semantics should somehow be invoked on the
      resources the object originally stored. As a hint, you may assume that `T` is default-constructible,
      i.e., `T{}` is a valid expression. What happens to the old resources when you assign to an object?

      This operation must take amortized $O (1)$ time.

    - `T& operator[](size_t)` and `const T& operator[](size_t) const` (take it as a freebie that the latter is
      a `const` method), which takes a ticket and returns a reference to the object stored at that slot.

      This operation must take $O (1)$ time.

    - `bool valid(size_t)`, which returns whether a slot both exists, and is active.

      This operation must take $O (1)$ time.

      *Hint*: you may want to use this method in assertions...

    - `size_t size()`, which returns the number of “registered” (stored) active objects

      This operation must take $O (1)$ time.

   For your personal implementation, it'd be nice to have a `void reserve(size_t capacity)`, but this is not
   required/marked by us.

2. *Entity manager.* In `entity_manager.h`, write the class template
   `template <typename... ComponentTypes> class EntityManager`, which is responsible for keeping track of
   valid entity IDs [+note1], storing all components in a SoA format, and finally mapping `EntityID`s to
   their component indices, for each component type. The goal is, if we have
   `EntityManager<int, float, bool> entityManager`, we can do something like the following:
   [+note1]: These are again just `size_t`s, but aliased via `using EntityID = size_t;`.

   ```cpp
   EntityID e = entityManager.createEntity();
   entityManager.addComponent(e, 5); // template argument deduction can tell this is addComponent<int>
   std::cout << entityManager.hasComponent<int>(e) << '\n';   // prints '1'
   std::cout << entityManager.hasComponent<float>(e) << '\n'; // prints '0'
   std::cout << entityManager.hasComponent<bool>(e) << '\n';  // prints '0'
   // std::cout << entityManager.getComponent<bool>(e) << '\n'; // should fail an assertion (HINT)
   std::cout << entityManager.getComponent<int>(e) << '\n';     // prints '5'
   ```

   ::: important Scope

   To make this task manageable for you (and to leave something for the project), you are **not responsible**
   for implementing `void removeEntity(EntityID)`, nor
   `template <typename ComponentType> removeComponent(EntityID)`! **However, the rest of your methods and
   data fields must be written as if these methods exist**. If it helps you to visualize and you have the
   free time, you are free to write these methods regardless, for no credit.

   :::

   For your convenience, here's a rough high-level guide. **Whenever we tell you to implement a method, we
   will not indicate whether it should be `const`**.

    1. Begin by defining `using EntityID = size_t` and writing your
       `template <typename... ComponentTypes> class EntityManager{};` class template.

    2. We know that we will need some way of doing a mapping from `EntityID` to component index, *for each
       component type*. Recall your analysis from Q3 of the prep. Choose a mapping scheme that prioritizes
       fast constant-time access and cache-friendliness.

    3. In the prep, we used `int32_t` for the component indices. In this exercise, use `size_t`s instead.
       We'll represent an invalid component index via `std::numeric_limits<size_t>::max()` instead of `-1`
       (you'll need the `<limits>` header). You may wish to define a `static constexpr` constant for this
       “invalid component index”...

    4. You will now need to figure out how to store a `Registry<ComponentType>` for each component type in
       your variadic list `ComponentTypes...`. Reference the prep Q2 and lecture material.

    5. Implement the method

       ```cpp
       EntityID createEntity()
       ```

       which returns the next entity ID. Similarly to the registry, entity IDs can grow without bound, and
       begin like $0, 1, 2, \dots$, until an entity is removed. At this point, any removed entity IDs may be
       recycled, and `createEntity` should prioritize recycling IDs. `createEntity` should update bookkeeping
       which maintains which IDs are up for recycling, what IDs are valid, as well as the
       Entity-to-ComponentIdx mapping (if you add a new entity, what are its component indices by default?)

    6. Implement the method

       ```cpp
       bool validEntity(EntityID)
       ```

       which has no preconditions (it can accept any invalid EntityID). It should return `true` iff the
       entityID is currently active. This means that the entity has been created more recently than it has
       been removed.

    7. Implement the method template

       ```cpp
       template <typename ComponentType> bool hasComponent(EntityID)
       ```

       which, given a valid Entity ID and a valid `ComponentType`, checks your Entity-to-ComponentIdx mapping
       to determine what index is being stored for the (entity, component type) pair, and check if this index
       is valid. If it's invalid, the entity does not have the component type passed as a template argument.

       You may find `Pack` from the Prep useful for doing `static_assert`ions on whether the template type
       arg are valid component types.

    8. Implement the method template

       ```cpp
       template <typename ComponentType> ComponentType& getComponent(EntityID)
       ```

       which, given a valid entity ID and a valid `ComponentType`, again finds the corresponding component
       index (if it exists) for the (entity, component type) pair. This time, use the index to get a
       reference to the component object.

       Trying to get a component which the entity does not have should lead to an assertion being triggered.

       You may find `Pack` from the Prep useful for indexing into your Entity-to-ComponentIdx mapping. Our
       solution uses the following:

       ```cpp
       static constexpr auto COMPONENT_TYPE_INDEX =
           Pack<ComponentTypes...>::template index<ComponentType>;
       ```

       Note that the `template` keyword is necessary when you're accessing dependent nested templates like
       this.

    9. Implement

       ```cpp
       template <typename ComponentType> void addComponent(EntityID id, ComponentType&& component)
       ```

       Here, `ComponentType&&` is a [forwarding reference](../3/cpp.md#forwarding-references). This
       method follows a similar pattern as the previous ones, except it ensures that the entity does *not*
       currently have the component type, and then perfectly forwards the argument to store in the correct
       registry.

       Because this is a forwarding reference, `ComponentType` might be a reference type. You can use
       `std::remove_reference_t<ComponentType>` from `<type_traits>` to convert it to the original type.

   A production implementation might also have template methods to get entire registries by reference, or to
   do runtime-indexing into the components instead of just compile-time indexing, via type-erased functions.
   We'll let you do these things on your own time :)

Test all your code in `main.cpp`. Your code must compile without warnings nor errors with
`cmake --build debug`.
