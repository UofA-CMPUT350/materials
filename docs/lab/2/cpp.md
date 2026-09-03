# C++ Prerequisite Knowledge

## Quick primer on unique pointers

*Reference: [Link](https://en.cppreference.com/w/cpp/memory/unique_ptr.html)*

A `std::unique_ptr<T>` (defined in the `<memory>` header) is a “smart pointer” to a `T` whose destructor automatically
calls `delete` on the owned object once the unique pointer goes out of scope.

Here’s some example usage:
``` cpp
{
    std::unique_ptr<int> intPtr; // holds nullptr
    if (intPtr) {
        // Only runs when intPtr.get() != nullptr
    }
    intPtr.reset(new int(5)); // how to assign new ptr to a unique_ptr, deletes previously
                            // owned value if not nullptr.
    std::cout << "value is " << *intPtr << '\n';
    std::cout << "raw address is " << intPtr.get() << '\n';

    // Alternatively, you can construct like this:
    std::unique_ptr<float> floatPtr(new float(2.5f));

    // If T is a class type, you can access its members like:
    std::unique_ptr<T> classPtr = /* ... */;
    classPtr->methodCall();
    classPtr->dataField;
} // both underlying raw int and float pointers are automatically deleted here.
```

## Dynamic arrays

In C++, the standard library provides (in the `<vector>` header) a class *template*, `std::vector<T>` which implements
a dynamic array for any type `T` known at compile time. 
Semi-official documentation [here](https://en.cppreference.com/w/cpp/container/vector.html).
Conceptually, a `std::vector<T>` might be implemented with the fields:
``` cpp
template <typename T> 
class vector {
private:
    T* mArray;
    size_t mLength;
    size_t mCapacity;
};
```

with appropriate constructors/destructor/assignment operators which manage the heap memory pointed to by `mArray`.
As you may already know, the length of a dynamic array refers to the *active* size of the array, and the capacity is
the *total* number of elements the heap memory (pointed to by `mArray`) could hypothetically store before you would
need to allocate a larger block of memory.

Instantiating a template class like `std::vector<T>` looks like:
``` cpp
std::vector<int> emptyInit; // constructs an empty vector.
std::vector<int> onlySize(5);   // constructs [0, 0, 0, 0, 0]
std::vector<float> sizeWithFillValue(3, 3.14f); // constructs [3.14f, 3.14f, 3.14f]
std::vector<float> initializerList{ 1.f, 2.f, 3.f, 10.f }; // [1.f, 2.f, 3.f, 10.f]
```

Here are some useful methods for operating on `std::vector`s.

- `push_back(x)` appends a copy of `x` to the end of the vector. If the vector has length equal to its capacity,
  this causes the allocation of a new, larger block of memory, and moves over all the old elements into the new memory,
  before appending:

  ``` cpp
  std::vector<int> v; // []
  v.push_back(5);     // [5]
  v.push_back(6);     // [5, 6]
  ```

- `size()` returns the current length (not capacity) of the vector as a `size_t`.
- `empty()` returns whether the vector is empty as a `bool`.
- `pop_back()` removes the last element of the vector. If the vector is empty, invokes undefined behavior:
  ``` cpp
  std::vector<int> v = { 1, 2, 3, 4, 5 }; // [1, 2, 3, 4, 5]
  v.pop_back(); // [1, 2, 3, 4]
  while(!v.empty()) {
      v.pop_back(); // [1, 2, 3], then [1, 2], then [1], then [].
  }
  ```
  However, this is not the most clean way to clear a vector.
- `clear()` removes and calls the destructors of every element in the vector.
  ``` cpp
  std::vector<int> v = { 1, 2, 3, 4, 5 }; // [1, 2, 3, 4, 5]
  v.clear(); // []
  ```
- `swap(std::vector<T>& other)` in constant time, swaps the contents of the current vector and the one provided as
  an argument. This is done by just swapping the length, capacity, and pointer stored in each with the other.
  ``` cpp
  std::vector<int> u = { 1, 2, 3 }; // [1, 2, 3]
  std::vector<int> v = { 4, 5, 6 }; // [4, 5, 6]
  u.swap(v); // now u has [4, 5, 6] and v has [1, 2, 3].
  ```
- `reserve(size_t n)`: if `n` is greater than the vector’s current capacity, allocates a new block of memory which
  supports *at least* `n` elements of type `T`. If a reallocation is triggered, the original values are copied over.
  Length is unaffected, only capacity may change. This is useful if you know you will want to `push_back` a certain
  number of elements from the beginning, and want to avoid pointless intermediate reallocations:
  ``` cpp
  std::vector<int> v;
  v.reserve(1000);    // allocate once (v is empty, so nothing copied over)
  for (int i = 0; i < 1000; ++i) {
      v.push_back(i); // no reallocations ever triggered in these push_back calls!
  }
  // v is now [0, 1, 2, ..., 998, 999]
  ```

As you would expect, the destructor of a vector calls the destructor of each element and then deallocates the heap
memory to prevent leaks.

### Efficiently filtering a vector

Suppose I have

``` cpp
std::vector<int> v = { 1, 2, 3, 4, 5, 6 };
```

and I want to filter `v` so it only stores the even numbers. Here’s a predicate:

``` cpp
bool isEven(int x) {
    return x % 2 == 0;
}
```

Here’s a way to filter `v` using only `push_back()`, `swap()` and `isEven`:

``` cpp
void keepEven(std::vector<int>& v) {
    std::vector<int> result;
    result.reserve(v.size()); // we know result will store at most v.size() elements.
    for (const auto& elem: v) {
        if (isEven(elem)) {
            result.push_back(elem); // can use std::move here when you learn move semantics.
        }
    }
    v.swap(result); // now v stores the filtered elements, result stores original contents of v.
} // result goes out of scope, destroying the original elements. v is left with filtered elements.
```
