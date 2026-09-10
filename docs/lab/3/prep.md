# Lab 3 Prep Problems

*Author: Daniel Zhang*

> [!WARNING]
> Due: September 15th 2026, 2:00pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-3-prep"></RepoCard>
> Click `Use this template` button to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

> [!IMPORTANT]
> Read [C++ Ownership and Move Semantics](cpp.md) before working on the prep problems.

## Problems

### Unique Ownership

Inside `UniquePtr.h`, implement a class template `UniquePtr<T>`, which manages *unique ownership* for a single raw
pointer to type `T`.

The semantics of unique ownership are as follows:

- *Initialization*: A `UniquePtr<T>` can either be default-initialized (i.e., with no arguments), or with a single raw
  pointer to `T`. In the first case, the `UniquePtr<T>` owns nothing (it is called *empty*); in the second case, the
  `UniquePtr<T>` takes ownership of the passed-in raw pointer.

- *Destruction*: Upon destruction, a `UniquePtr<T>` destructs the pointed-to `T` (if any), and then deallocates the
  memory that the `T` occupied. Otherwise if it is *empty*, then nothing happens.

- *Copy semantics*: A `UniquePtr<T>` cannot be copied. Recommended reading to understand why:
  sections [Object slicing](../../misc/cpp.md#object-slicing)
  and [A note on the special member functions and virtual](../../misc/cpp.md#a-note-on-the-special-member-functions-and-virtual)
  of the C++ notes.

- *Move semantics*: A `UniquePtr<T>` can be moved from, in which case it loses ownership of its original raw pointer (if
  nonempty). The `UniquePtr<T>` is then allowed to be left in any valid state, so long as it does not own the original
  pointer.

  If an existing `UniquePtr<T>` is moved into, its original contents (if nonempty) should be eventually destructed and
  deallocated somehow.

You should implement the following methods. **We have not indicated which ones should be marked `const` methods** — you
are responsible for determining this.

- The special methods (ctors, assignment ops, dtor), including marking any disallowed methods as `= delete` (indicating
  they cannot be called).
- A converting constructor template which takes an rvalue reference like `UniquePtr<U>&&` (where `T != U` in general)
  and steals ownership of the other unique pointers managed raw pointer, also implicitly converting the `U*` to our
  `T*`. **Note: no explicit casting needed here.**
- A dereference operator `T& operator*()`, which returns a reference to the underlying managed object (hence allowing
  `T& ref = *uniquePtr;`).
- An arrow operator `T* operator->()`, which returns the underlying pointer (hence allowing member access like so:
  `uniquePtr->fooMethod()`).
- `T* get()`, which also returns the underlying raw pointer.
- A comparison operator `bool operator==(const UniquePtr<T>& other)`, which checks whether both unique pointers have the
  same raw pointer. This also automatically gives you `operator!=`.
- `T* release()`, which releases ownership of the underlying raw pointer and returns it.
- `void reset(T* newPtr = nullptr)`, which begins managing `newPtr` and then deletes the previously owned pointer (if it
  was not `nullptr`).
- `void swap(UniquePtr<T>& other)`, which swaps the managed raw pointers of `*this` and `other`.
- `operator bool()`, which returns `true` iff the unique pointer is nonempty.

You may assume `T` is not an array type, nor a reference type, and furthermore that the memory it owns was allocated by
`new` (and so a custom deleter is unnecessary).

Test your implementation in `main.cpp`

### Creating a Unique Pointer

In the same file, implement a function template `makeUnique<T, Args...>` which uses variadic templates and perfect
forwarding to allocate a new `T` on the heap, constructed with custom arguments of types `Args...`, and then manages it
with a `UniquePtr<T>`. In particular, any arguments that are passed in as rvalue expressions should be moved from in the
initialization of the raw pointer.

The function template should look like:

```cpp
template <typename T, typename... Args>
UniquePtr<T> makeUnique(Args&&... args)
{
    /* ... your code here ... */
}
```

so that, for example, you can call:

```cpp
UniquePtr<int> uniquePtr1 = makeUnique<int>(5); // copy is elided
// or alternatively
auto uniquePtr2 = makeUnique<int>(5);
// Both UniquePtr<int>s own a heap-allocated int storing 5.
```

Test your implementation in `main.cpp`

*Hint*: to call a templated function `template <typename T> f` on each element of a function parameter pack `args...`
with corresponding template parameter pack `typename... Args`, and to expand the results: `f<Args>(args)...` which is
conceptually `f<Arg1>(arg1), f<Arg2>(arg2), ..., f<ArgN>(argN)`.

### Constness and the Owned Object

Consider the following question while implementing your `UniquePtr<T>`: suppose I take a const (lvalue) reference to a
`UniquePtr<T>` like so:

```cpp
void f(const UniquePtr<T>& x)
{
    // Can I modify the member fields of x's owned object here?
}
```

Should or shouldn't I be able to modify the member fields of the owned object inside `f`? If you want a `UniquePtr`
which disallows modification to the stored object, how can you do this?

## Requirements

Assert all preconditions. Your program should compile without warnings nor errors with

```bash
cmake --preset debug
cmake --build build
```

Ensure your design does not leak memory. You may use tools like your compiler's address sanitizer, or memory leak
detectors like `valgrind`, `leaks` to aid with this.
