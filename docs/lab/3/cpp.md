# C++ Ownership and Move Semantics

*Author: Daniel Zhang*

::: tip Reading guide

Most of the material needed for the [prep problems](prep.md) is covered by the [TL;DR](#tl-dr). The rest provides a
deeper explanation.

:::

## TL;DR

You're probably bad at manually managing memory (raw pointers to the heap). Here's a cool idea: have classes who “own”
the memory[+note-1], and whose destructors automatically call `delete` on the memory for you. This mechanism is called
RAII (Resource Acquisition is Initialization). You can implement these classes yourself (and they can own other things
than memory, but not our focus today):

[+note-1]: They “own” the responsibility of destructing + deallocating it.

```cpp
#include <iostream> // std::cout, std::endl

class IntPtr {
public:
    IntPtr(int* p = nullptr)
        : mPtr { p }
    {
    }
    ~IntPtr()
    {
        if (mPtr != nullptr) { // check technically not necessary since
                               // delete nullptr is no-op, but good as general
                               // pattern.
            delete mPtr;
        }
    }

    // MISSING: copy and move constructors/assignment operators.

    int& operator*() const { return *mPtr; } // allows for dereference of IntPtrs.

private:
    int* mPtr;
};

int main()
{
    IntPtr ptr(new int(5));
    std::cout << *ptr << '\n';
} // ptr's destructor automatically called here, memory automatically freed for you!
```

Wait, but to copy one of these classes, you can't just bitwise copy it, because then two objects will delete the same
pointer when destroyed. So copying logic must clone the pointed-to memory. Consider using the copy-and-swap idiom for
copy assignment.

What if I want to transfer (steal) the “ownership” of the memory to another object, instead of cloning it? This is
called **move semantics**. For a class to support stealing, it should implement the move constructor and assignment
operator. They look something like:

```cpp
class MyClass {
public:
    // ...

    // Move constructor
    MyClass(MyClass&& other)
    {
        // Bitwise copy the other guy's stuff (e.g. pointers),
        // then set the other guys resources to "null" resources.
        // We have thus "stolen" their stuff.
    }

    // Move assignment operator
    MyClass& operator=(MyClass&& other)
    {
        // Swap our stuff with the other guy's stuff.
        // We have thus "stolen" their stuff. Since they will die soon, they will
        // free our original resources when they destruct.
        return *this;
    }
};
```

See [Example of a class with move constructor/assignment](#example-of-a-class-with-move-constructor-assignment) for a
fuller example with copy and move semantics. You can use `std::swap(x, y)` in the `<utility>` header to do swapping for
you.

To call a move constructor:

```cpp
#include <utility> // for std::move

MyClass originalThing(/* constructor args */);
// ...
MyClass newThing(std::move(originalThing));
```

To call a move assignment operator:

```cpp
#include <utility> // for std::move

MyClass thing1(/* constructor args */);
// ...
MyClass thing2(/* constructor args */);
// ...
thing2 = std::move(thing1);
```

Overloading:

```cpp
void foo(const SomeOwningClass& x) // (a)
{
    T copied(x); // x is copied into 'copied'.
}

void foo(SomeOwningClass&& x) // (b)
{
    T moved(std::move(x)); // x is moved into 'moved'.
}

SomeOwningClass x(/* constructor args */);
f(x); // calls (a)
f(std::move(x)); // calls (b)
```

Perfect forwarding: *forwarding references* (aka “universal references”) can accept both lvalue references (normal
references) and rvalue references (things you `std::move`'d). You can “pass them on” as their original form (whether
lvalue or rvalue) via `std::forward`:

```cpp
#include <utility> // std::forward
#include <type_traits> // std::remove_reference_t<T>

template <typename T>
void foo(T&& x) // T&& is a forwarding reference here.
{
    // Perfect forwarding:
    //  if x is an rvalue reference, x is moved into copiedOrMoved.
    //  if x is an lvalue reference, x is copied into copiedOrMoved.
    std::remove_reference_t<T> copiedOrMoved(std::forward<T>(x));
}

int main()
{
    int x = 5;
    foo(5); // calls foo<int>(int&& x); rvalue overload is called.
    foo(x); // calls foo<int&>(int& x); lvalue overload is called.
}
```

## Prerequisites

In C, resources such as heap memory were managed manually. This meant manually handling responsibility for acquiring and
releasing resources, ensuring that resources are released *exactly* once, and also ensuring that resources are not
accessible after being released. In simple programs, this is easy enough, but in complex real-world systems, manual
resource management can be very non-trivial. For this reason, the majority of vulnerabilities in real-world software are
memory safety vulnerabilities[+note-2].

[+note-2]: [Chromium says 70%](https://www.chromium.org/Home/chromium-security/memory-safety/), as
does [Microsoft](https://www.zdnet.com/article/microsoft-70-percent-of-all-security-bugs-are-memory-safety-issues/).

One key benefit of C++ over C is the ability to tie *ownership* of *resources* to the *lifetime* of variables, which
allows the program stack to automatically manage resources for us, using an idiom called *Resource Acquisition is
Initialization*. In this lab we explore the principles of ownership, lifetimes, move semantics, and smart pointers,
unlocking automatic resource management and transfer with marginal (if any) runtime cost.

### Resources & Ownership

A *resource* is anything of limited availability that must be *acquired* before usage, and *released* after being used.
Typical examples of resources are heap memory (in C, `malloc`/`free`), file handles (in C, `fopen`/`fclose`), mutex
locks (`lock`/ `unlock`).

A *resource leak* occurs when a program acquires a resource, but fails to release it. Because the underlying resource is
scarce, continuously failing to release it causes the eventual starvation of resources. You may already have experienced
this by forgetting to `free` heap memory, causing a *memory leak*. For those familiar with concurrency, failing to
unlock a mutex can cause deadlock.

For any acquired resource, it is idiomatic to assign responsibility to some object or group of objects to handle the
release of a resource once it is acquired, so that it

1. is guaranteed to be released (preventing leaks), and
2. won't be released more than once (preventing double frees).

An object or group of objects which is responsible for releasing a resource is said to have *ownership* of the resource.

#### Lifetimes

::: tip

Skip the Definition for the problems, just look at the Timeline.

:::

Here we take a deeper look into *lifetimes* for objects and references. *Basically*, the lifetime is the interval of
time between an object/reference's construction and destruction.

::: info

**Definition (Lifetime of an object).** In C++, the *lifetime* of an **object** of type `T` is a runtime property which
begins when

- its underlying storage with proper size and alignment is obtained, **and,**
- its initialization (if any[+note-3]) is **complete**.

  [+note-3]: If `T` is not a class type, default initialization (e.g., `int x`) performs no initialization at all, leaving
  the value *indeterminate*. Reading an indeterminate value is *undefined behaviour*. Use *value initialization* (with
  empty curly braces) to ensure a starting value of 0.

The lifetime of an object of type `T` ends with:

- if `T` is a non-class type (e.g., `int`), the object is destroyed, **or,**
- if `T` is a class type (i.e., `class`, `struct`, or `union`), the destructor call **starts**, **or,**
- the storage which the object occupies is released, or is reused by an object that is not nested within it (e.g., a
  sibling `union` member).

On the other hand, the lifetime of a **reference** begins when its initialization is complete (when it has been bound to
an object) and ends as if it were a scalar. If the lifetime of a reference exceeds the lifetime of the object it was
bound to, it becomes a *dangling reference*.

:::

**Timeline**. Once can basically think of the sequence of events surrounding a lifetime as:

1. Storage (memory) is allocated (with proper size & alignment),
2. Object is initialized in the storage (for class types, this means the constructor body is complete), which is
   immediately tied to:
3. Lifetime starts,
4. *(Object is used here...)*
5. Lifetime ends, which is tied to (caused by the start of):
6. Object destruction, and finally
7. Storage is deallocated.

#### Resource Acquisition is Initialization (RAII)

C++ automatically calls constructors to initialize class-type objects (after allocating their memory), and automatically
calls destructors to destroy them (before deallocating their memory). For “regular” objects/variables allocated on the
stack inside functions[+note-4] (these are called *local variables* which have “ *automatic storage duration*”), this
means that the stack automatically takes care of the object lifetime for us. One key benefit of these C++ features is
that this allows us to **tie the holding/management of a resource to the lifetime of an object (the *owner*)**. This is
called *Resource Acquisition is Initialization (RAII)*[+note-5].

[+note-4]: i.e., not declared `static`, `extern`, nor `thread_local`.

[+note-5]: Although arguably better names such as “Scope-bound Resource Management” (SBRM) or “Constructor Acquires,
Destructor Releases” (CADRe) have been suggested, RAII is the name it is generally known by.

An RAII class acquires its resource in its constructor, and releases it in its destructor. Its (copy/move)
(constructors/assignment operators) also have to correctly handle the resource.

Here is a very basic (and incomplete — no copy/move semantics) example:

```cpp
#include <iostream> // std::cout, std::endl

class IntPtr {
public:
    IntPtr(int* p = nullptr)
        : mPtr { p }
    {
    }
    ~IntPtr()
    {
        if (mPtr != nullptr) { // check technically not necessary since
                               // delete nullptr is no-op, but good as general
                               // pattern.
            delete mPtr;
        }
    }

    int& operator*() const { return *mPtr; }

private:
    int* mPtr;
};

int main()
{
    IntPtr p0; // holds nullptr

    // create a scope:
    {
        IntPtr p(new int(1234));
        std::cout << *p << std::endl; // prints '1234'
    } // p.~IntPtr() is called, deleting the memory managed by p
} // p0.~IntPtr() is called, but p0 stores nullptr so nothing happens.
// No memory leaks, without manually calling delete!
```

Assuming your resource-owning class is implemented correctly[+note-6], RAII ensures that we avoid memory leaks and
double frees. The resource-owning class-type object goes out of scope exactly once, hence the constructor is called
exactly once, hence `delete` is called exactly once. RAII is a *zero-cost abstraction* — it incurs **no additional
runtime cost** to automatically manage resources[+note-7]. This is as opposed to *garbage collection*, which must halt
the program to perform cleanup steps.

[+note-6]: Spoiler: the Standard Library implements many of these for us!

[+note-7]: In general, C++ abstractions follow the *zero-overhead principle*: “what you don't use, you don't pay for;
what you do use, you couldn't hand code any better”.

### Move semantics

Move semantics allow us to *transfer ownership* between objects, as opposed to copying resources (if it is possible to
copy at all). Suppose we had a `std::vector`, which *owns* a contiguous heap-allocated dynamic array like so:

`std::vector<int> l1{0, 1, 2, 3, 4, 5};`

and we write

`std::vector<int> l2 = l1;`

What should this do? Internally, we can expect `std::vector<int>` to be laid out in memory something like this:

```cpp
namespace std {

template <typename T>
class vector {
    T* mArr;          // contiguous heap-allocated array
    size_t mSize;     // number of items mArr currently stores
    size_t mCapacity; // max. number of items mArr can store
};

}
```

Until now, you have seen the following two possibilities:

#### Shallow Copying

`l2 = l1` just *shallow copies*:

```cpp
l2.mArr = l1.mArr;
l2.mSize = l1.mSize;
l2.mCapacity = l1.mCapacity;
```

This is the behaviour you see in C.

#### Deep Copying

`l2 = l1` clones `l1`. In particular, `l2` allocates a distinct new buffer on the heap of size `l1.mCapacity`, and the
elements of `l1.mArr` are copied over element-wise into `l2.mArr`.

In C++, [shallow copying](#shallow-copying) would be problematic because `std::vector` owns the buffer it points to. At
the end of a shallow copy, two objects believe they have ownership of the same buffer, which means both of them will
call `delete` on the same pointer in their destructor. This is a double free — undefined behaviour!

On the other hand, [deep copying](#deep-copying) is the behaviour we have taken advantage of until now: `std::vector`
has a *copy constructor* whose declaration looks something like

`vector(const std::vector<T>& other);`

which can read (but not modify) the contents of `other` (here, `l1`), allocate its own buffer, and clone over elements
as needed. In this case, both `l1` and `l2` own their own copy of a heap-allocated `mArr`.

What if `l1`'s lifetime is about to end? In other words, we *know* that the original thing we were copying from is about
to die, and that its destructor will run soon. In this case, why copy and then destroy the original, when we could've
*stolen the original directly*? In this case, we *want* `l2` to take ownership of the original buffer of `l1`. This is
exactly what move semantics does:

#### Moving Resources

`l2 = l1` *moves* the resources of `l1` into `l2`[+note-8]: first, `l1` is shallow-copied into `l2`. Then, `l1` is
placed into a “valid but unspecified state”, meaning class invariants still hold on `l1` (it can still be destructed)
but it no longer owns/refers to its original resources.

[+note-8]: Alternatively, we might say `l2` *steals* the contents of `l1`.

The caveat to [moving resources](#moving-resources) is that it only happens when `l1` is of a specific *value category*
(see [Value categories](#value-categories) & [Value categories (in modern C++)](#value-categories-in-modern-c)). A *move
constructor* looks like:

`MyType(MyType&& other);`

Note that the reference parameter is now of the form `T&&` instead of `const T&`[+note-9]. We can call a move
constructor like so:

[+note-9]: Necessarily, `const` is now gone because to move (steal) the contents of an object we must be able to modify
it.

`std::vector<int> l2 = std::move(l1);`

which invokes the [move behaviour](#moving-resources) described above. To understand what this new reference type `T&&`
signifies and when it applies, we turn our attention to *value categories*.

#### Value categories

All expressions have a value category. In modern C++, value categories effectively communicate two things:

1. **Existence of identity**: *“When is the compiler **required** to act as if an expression has a memory address?”*
2. **Moveability**: *“When am I allowed to steal from an expression's resources?”*

Recall that an *expression* is a sequence is a sequence of operators and their operands which specifies a computation,
which may result in a value and may also cause side effects. For example, `5 + 7` is an expression (which results in
`12`), as is the assignment `x += 7 + y`. Historically (even in C), all (sub-)expressions were classified by simple
categories, *lvalues* and *rvalues*, which classified where they could be placed in an assignment. For example, if we
declare `int x;`, then consider the assignment expression `x = 5`. In C (and classic C++):

- The subexpression `x` is an ***l**value* because it determines an object with a specific address in memory, (which in
  this case can be assigned to). Hence it is allowed to show up on either the **l**eft side or the right side of an
  assignment.
- The subexpression 1 is an ***r**value*, because it does not reside in a specific place in memory, and hence cannot be
  assigned to (e.g., `1 = x` makes no sense). Hence it can only fully make up the **r**ight side of an assignment.

The fundamental separation in both C and classic C++ between lvalues and rvalues is determined by whether an expression
results in (is associated to) a unique *identity* of an object. An identity is a unique identifier (a specific memory
address). All variable names are lvalues, because they determine a specific object occupying memory. Similarly,
dereferencing a pointer gives the unique object living at that memory location, so the resulting reference is an lvalue.
On the other hand, the temporary intermediate results of expressions such as `x + 5` do not have a specific identity or
knowable memory address, so they are rvalues.

| has (determines) identity | doesn't have identity |
|---------------------------|-----------------------|
| lvalue                    | rvalue                |

The fundamental decomposition of value categories in **C & classic C++**

::: info

**Aside: Why classify expressions into value categories?** If a compiler can assume that an rvalue does not necessarily
occupy a specific memory address, it can produce more efficient code. For example, both ARM and x86-64 architectures
have *immediate operands*, which can encode an operand directly into an instruction. The following in ARM assigns an
embedded value 15 to register 0:

```text
MOV r0, #0xF
```

We can see a similar motivation if, say, we had a function of signature `void f(std::string s)` and we called
`f(std::string("My newly created string"));` — without value categories, we would have to create a copy of the temporary
string argument and then immediately destroy the original temporary.

**Note.** The above classifications of lvalues and rvalues in classic C++ hold conceptually in that you could always
treat lvalues *as if* they had storage in memory, and rvalues *as if* they didn't. In reality, the compiler might
optimize away memory storage for lvalues (into just registers), and it might allocate memory for rvalues (if they are
too large to fit into registers, or if they are of class type).

:::

#### Lvalue and rvalue references

To facilitate move semantics, C++11 introduced the *rvalue reference*. Given a type `T`, an *lvalue reference* to `T` is
declared `T&`, and an *rvalue reference* to `T` is declared `T&&`. They bind as follows:

*Binding rules*:

- Lvalue references (`T&`) may bind to lvalue expressions, but not rvalue expressions.
- Lvalue references to `const` (`const T&`) may bind to both lvalue and rvalue expressions.
- Rvalue references (`T&&`) may bind to rvalue expressions, but not lvalue expressions.

There is some redundancy in the rules above (an rvalue expression can bind to both lvalue `const` references and rvalue
references). Thus, we have precedence rules.

*Precedence rules*: Suppose you have overloads `void f(T&)`, `void f(const T&)`, and `void f(T&&)` (note the return type
is not relevant). Then:

- An rvalue expression will bind to `T&&` over `const T&`, if both overloads are present.
- A non-const lvalue expression will bind to `T&` over `const T&`, if both overloads are present.

Also note that, of course:

- A const lvalue expression (of type `const T&` or `const T`) cannot bind to `T&`, just a `const T&`.

However, with the addition of move semantics, the distinction *has identity/doesn't have identity* is insufficient to
determine whether something should be an lvalue or an rvalue, because *sometimes we want to steal resources from objects
which have a memory address (identity)*. To indicate we want to treat an lvalue expression as an rvalue (something we
can move from), we just *cast it to an rvalue reference*:

```cpp
void f(T&& x) { /* steal x's contents here... */ }

T thing = T(/* constructor args */);
f(static_cast<T&&>(thing)); // casts lvalue expression 'thing' to rvalue reference
```

This is rather cumbersome, so in the `<utility>` header, the STL defines `std::move`, which does essentially the above —
here's a simplified implementation:

```cpp
// noexcept, inline, and constexpr removed for clarity:
template <typename T>
std::remove_reference_t<T>&& move(T&& x) {
    return static_cast<std::remove_reference_t<T>&&>(x);
}
```

::: important

`std::move(x)` **does not move any resources from `x` for you!** It just casts it to an rvalue reference, and the
function overload which takes the rvalue reference is responsible for implementing the resource stealing!

:::

#### Value categories (in modern C++)

In C++11 onwards, all expressions fall into **exactly one of** three primary value categories:

1. *lvalue*: an expression that has an identity (memory address) and cannot be moved from. For example, all **variable**
   names[+note-10], `x`, `*ptr`, `++x`, `foo()` if `foo` returns a `int&`. Notably, string literals are also lvalues
   (unlike all other literals), e.g., `"Hello world!"`.
2. *prvalue* (“pure” rvalue): an expression that doesn't have an identity (memory address) and can be moved from. They
   are the result of any function that returns a non-reference type, and also all non-string literals. For example, `5`,
   `x + 5`, `&x`, `x++`, `true`, `foo()` if `foo` returns an `int`.
3. *xvalue* (“eXpiring” value): An expression which both has an identity (memory address) and can be moved from (can
   have its resources stolen). For example, `std::move(x)`, `std::move(x).fieldName`, `foo()` if `foo` returns an
   `int&&`.

[+note-10]: Note names of `enum`s like `Color::RED` are prvalues.

There also exist two mixed categories which generalize the above:

1. *glvalue* (“generalized” lvalue): the union of lvalues and xvalues; the set of all expressions with an identity.
2. *rvalue*: the union of prvalues and xvalues[+note-11]; the set of all expressions that can be moved from.

[+note-11]: Note that even though rvalues include xvalues (which have an identity and hence a memory address), you are
not permitted to directly apply the address operator (`&`) on *any* rvalue.

The following table shows the decomposition of value categories in C++11 and beyond:

|                              | has identity *(glvalue)* | doesn't have identity |
|------------------------------|--------------------------|-----------------------|
| cannot be moved from         | lvalue                   | *N/A*                 |
| can be moved from *(rvalue)* | xvalue                   | prvalue               |

The fundamental decomposition of value categories in modern C++.

Practically speaking, while thinking about move semantics, it is usually sufficient to mentally partition expressions
between the primary category *lvalues*, and the mixed category *rvalues*.

In reality, whenever we want to *move* resources from an lvalue, we signal that its lifetime is *expiring* by converting
it to an *x*value (hence an rvalue) using `std::move`.

A prvalue can also be converted to an xvalue (i.e., giving it a memory address) whenever you bind a reference (whether
rvalue or const lvalue) to it. When you bind a reference to a prvalue, two things happen:

1. *Temporary materialization conversion*: A temporary object is initialized (“materialized”) from the result of the
   prvalue expression. Unlike the original prvalue, this temporary object is an (expiring) xvalue, meaning it now has
   identity (a location in memory).
2. *Lifetime extension*: The temporary object has its lifetime extended to the lifetime of the reference being bound to.

#### A named rvalue reference is itself an lvalue expression

Consider the following block of code:

```cpp
void f(T&& val) {
    T copied = val; // calls copy constructor T(const T&)
    T moved = std::move(val); // calls the move constructor T(T&&)
}

int main() {
    T original( /* constructor args ... */);
    f(std::move(original)); // must cast to rvalue ref to call f, due to binding rules.
}
```

In main, we pass `original` as an rvalue (specifically an xvalue) by passing `std::move(original)` to `f`. However, in
the body of `f`, `val` is a **named** rvalue *reference*, making its name “`val`” an lvalue *expression* (because all
variable names are lvalue expressions). To re-use it as an rvalue expression requires another call to `std::move`.

This is admittedly confusing upon first glance. The distinguishing point here to remember is that “rvalue references”
and “lvalue references” are just names for certain types, and that this is a separate axis from the actual *value
category* of expressions involving such reference types. *Named* rvalue references are named variables, hence lvalue
**expressions**. The unnamed result of a function returning an rvalue reference (e.g., the result of `std::move`) is an
rvalue **expression**.

#### Example of a class with move constructor/assignment

Classes which own a resource have similar meta-patterns in their implementation, so we give you a generic example here.

Suppose that:

- You have a raw handle of type `Handle` (this might be a pointer like `int*` for example). Implicit in this is that a
  raw handle has no special ownership semantics by itself — like a raw C pointer. For example, a bitwise copy of a
  handle will just point to the same resource, and neither claims ownership.
- This handle's resource can be released by calling `void release(Handle handle)`.
- The default constructor for `Handle` (i.e., `Handle()`) produces an empty handle which points to no resource (like
  `nullptr`).
- If the resource has cloning semantics, that you can clone the underlying resource pointed to by a `Handle` via a call
  to `Handle clone(Handle handle)`, which returns a different handle pointing to the cloned resource.

Then this is a barebones, generic implementation of a class *owning* the resource pointed to by the `Handle`. Usually
you would also have a method that dereferences the pointed-at resource (omitted here):

```cpp
#include <utility> // std::swap

class ResourceOwner {
public:
    // Default constructor
    ResourceOwner(Handle resource = Handle())
        : mResource { resource }
    {
    }

    // Destructor
    ~ResourceOwner()
    {
        if (mResource != Handle()) {
            release(mResource);
        }
    }

    // Copy constructor
    ResourceOwner(const ResourceOwner& other)
        : mResource { clone(other.mResource) }
    {
    }

    // Move constructor
    ResourceOwner(ResourceOwner&& other)
        : mResource { other.mResource }
    {
        other.mResource = Handle(); // steal ownership from other, mark them plundered.
    }

    // Copy assignment
    ResourceOwner& operator=(const ResourceOwner& other)
    {
        // copy-and-swap idiom:
        ResourceOwner otherClone(other); // calls copy constructor. You can also just pass by value
                                         // for the parameter, which makes the copy for you.
        std::swap(mResource, otherClone.mResource);
        return *this; // assign. operator always returns *this.
    } // otherClone goes out of scope, but our original resource was given to otherClone,
      //  hence otherClone's dtor releases our original resource.

    // Move assignment
    ResourceOwner& operator=(ResourceOwner&& other)
    {
        std::swap(mResource, other.mResource);
        return *this; // assign. operator always returns *this.
    }

private:
    Handle mResource;
};
```

In the copy assignment implementation, we make use of the *copy-and-swap* idiom. Recall the trivial implementation of
swap: you create a temporary variable, copy the ﬁrst argument into the temporary, copy the second argument into the
ﬁrst, and ﬁnally copy the temporary into the second argument. `std::swap` is the same, except it avoids unnecessary
copies when move semantics are supported:

```cpp
template <typename T>
void swap(T& first, T& second)
{
    T temp = std::move(first);
    first = std::move(second);
    second = std::move(temp);
}
```

Convince yourself that the above implementation of swap works, and moreover that it works even if `first` and `second`
refer to the exact same variable.

The copy-and-swap idiom uses the copy constructor to clone the `other` variable, and then swaps the contents of
ourselves with the clone. When the clone goes out of scope, the destructor call will clean up our original resources.
Why is this solution better than manually calling `clone` on `other`'s resource?

- **Avoids a self-assignment check**: Both the move and copy assignment operators are required to support `x = x`.
  Without copy-and-swap, this means you need an extra `if (this != &other) { /* cloning logic here ... */ }`.
- **Provides strong exception safety**: If an exception is thrown in the cloning process (e.g., calling `new` to
  allocate more memory), then `this` has not been modified yet. In other words, our original object is left in a valid
  state.
- **Reduces code duplication**: Your copy constructor will already implement cloning logic — copy-and-swap re-uses this
  code, meaning easier maintenance and less chance of bugs (e.g., you fix one implementation and forget to fix the
  other).

Recall that when we want to move from an object, it is converted to an *expiring* value. Use this to convince yourself
why our implementation of the move assignment using `std::swap` works. In particular, how do we know our original
resources will be freed?

#### Compiler generated special methods

Under sane conditions, your C++ compiler will implicitly declare and define constructors, assignment operators, and a
destructor for you, contingent on certain conditions. For example, as per the rule of 5, the compiler will not define a
move assignment operator for you if you manually declared a move constructor, copy assignment operator, copy
constructor, or destructor. The rules for when the compiler generates special methods for you are covered in detail in
our C++ notes from
sections [Principles/intuitions for compiler-generated special methods](../../misc/cpp.md#principles-intuitions-for-compiler-generated-special-methods)
to [A summary of implicitly-defined special member functions](../../misc/cpp.md#a-summary-of-implicitly-defined-special-member-functions).
Here's a table that summarizes what special methods, when manually implemented, block the implicit definition of others:

| Compiler supplies ↓ / You write → | None | Default constructor |   Destructor    | Copy constructor | Copy assignment | Move constructor | Move assignment |
|-----------------------------------|:----:|:-------------------:|:---------------:|:----------------:|:---------------:|:----------------:|:---------------:|
| Default constructor               |  ✓  |         ♦          |       ✓        |        ✕        |       ✓        |        ✕        |       ✓        |
| Destructor                        |  ✓  |         ✓          |       ♦        |        ✓        |       ✓        |        ✓        |       ✓        |
| Copy constructor                  |  ✓  |         ✓          | ✓ (deprecated) |        ♦        | ✓ (deprecated) |        ✕        |       ✕        |
| Copy assignment                   |  ✓  |         ✓          | ✓ (deprecated) | ✓ (deprecated)  |       ♦        |        ✕        |       ✕        |
| Move constructor                  |  ✓  |         ✓          |       ✕        |  Copies instead  | Copies instead  |        ♦        |       ✕        |
| Move assignment                   |  ✓  |         ✓          |       ✕        |  Copies instead  | Copies instead  |        ✕        |       ♦        |

✓: implicitly supplied; ✕: not supplied or deleted; ♦: supplied by you. “Copies instead” means overload resolution
results in copying.

*Note:* The cells marked (deprecated) will yield a compiler warning, because relying on the implicitly-defined special
member functions in these cases indicates a violation of the rule of three.

If implicitly defined, the compiler-generated methods do the following:

- The default constructor calls the default constructors of its virtual bases in initialization order (if the class is
  most-derived), then the default constructors of direct base subobjects in left-to-right order, and then member field
  subobjects in top-to-bottom declaration order. This order is called initialization order.
- The copy constructor calls the copy constructor of all subobjects in the same initialization order described above.
- The copy assignment operator calls the copy assignment operators of all subobjects in the same initialization order
  described above.
- The move constructor calls the move constructors of all subobjects in the same initialization order described above.
- The move assignment operator calls the move assignment operators of all subobjects in the same initialization order
  described above.
- The destructor calls member field destructors in reverse order of initialization, then destructors for non-virtual
  direct base classes, in reverse order, and then, if the class is of most derived class, the destructors of all virtual
  bases in reverse order.

#### The rule of three/five/zero

Good rules of thumb when manually writing special methods for class types:

- *The rule of three*: If a class requires any of a user-defined (destructor, copy constructor, or copy assignment
  operator), it almost always requires all three.

- *The rule of five*: If a class requires special move semantics (i.e., a custom move constructor or move assignment
  operator), it will almost certainly need a custom definition for all five of (copy/move constructor/assignment
  operators, and destructor).

- *The rule of zero*: All classes which don't deal directly with resource ownership should have **no** custom
  destructor, copy/move constructors, nor copy/move assignment operators, instead relying on the compiler generated
  special methods ([Compiler generated special methods](#compiler-generated-special-methods)).

  For example, consider the following struct:

  ```cpp
  struct MyStruct {
      std::vector<int> list1;
      std::vector<double> list2;
  };
  ```

  The implicitly defined destructor, copy/move constructors, and copy/move assignment operators all automatically call
  the corresponding methods for the members `list1` and `list2`, meaning it's unnecessary to manually define the same
  special methods for `MyStruct`. So the following code works as you'd expect:

  ```cpp
  {
      MyStruct s1{};
      s1.list1.push_back(5);
      MyStruct s2 = std::move(s1); // s2.list1 is now [5], s1.list1 is now [].
  } // both s1 and s2's list elements destructed and then the vector heap memory
    //    is freed here.
  ```

To understand the rules of three and five, remember that for basic types, copies are just bitwise copies. Needing to
trigger custom logic to do a copy likely implies that you store some *handle* to some resource, and that copying the
handle bitwise is not enough. Thus, you need a destructor to also release the resource. Conversely, having a custom
destructor also implies having a handle to a resource, hence requiring custom copy logic. This explains the rule of
three.

The rule of five follows because special move semantics also implies ownership of a resource. In the converse direction,
if you own a resource, move semantics are typically an *optional optimization* you may make to avoid copies.

**Aside.** CMPUT **350** :)

### Forwarding references

Sometimes, when defining function overloads, we want to move *if possible*, and otherwise copy. One can always manually
define both copy- and move- overloads like so:

```cpp
void foo(const SomeOwningClass& x)
{
    T copied(x); // x is copied into 'copied'.
}

void foo(SomeOwningClass&& x)
{
    T moved(std::move(x)); // x is moved into 'moved'.
}
```

But what if you want to take arbitrarily long parameter lists? The number of overloads goes up by $2^{\lvert L\rvert}$,
where $L$ is your parameter list.

When you have a function template and your arguments are declared *as if* they are rvalue references to type template
parameters of the function template, *forwarding references* automatically instantiate the right parameter list types
for you:

```cpp
#include <utility> // std::forward
#include <type_traits> // std::remove_reference_t<T>

template <typename T>
void foo(T&& x) // T&& is a forwarding reference here.
{
    // Perfect forwarding:
    //  if x is an rvalue reference, x is moved into copiedOrMoved.
    //  if x is an lvalue reference, x is copied into copiedOrMoved.
    std::remove_reference_t<T> copiedOrMoved(std::forward<T>(x));
}

int main()
{
    int x = 5;
    foo(5); // calls foo<int>(int&& x); rvalue overload is called.
    foo(x); // calls foo<int&>(int& x); lvalue overload is called.
}
```

In the above, `std::forward` returns an rvalue reference (like `std::move`) when `x` is an rvalue, and otherwise it
returns an lvalue reference.

A *forwarding reference*[+note-12] is a function parameter of a function template, declared as an rvalue reference to a
cv-unqualified type template parameter of the function template parameter of the function template. Why do these work,
and how does `std::forward` work?

[+note-12]: Also known as a *universal reference*.

**Note.** A forwarding reference is **not** (always) resolved to an rvalue reference, it just *looks* like one. It must
always look like `T&&`, where `T` is a type template parameter **of the function template**. See the following examples:

```cpp
template <typename T>
void foo(T&& x); // forwarding reference!

template <typename T>
void foo(const T&& x); // rvalue reference, not forwarding because of const-qualifier.

template <typename T>
struct MyStruct {
    void foo(T&& x); // rvalue reference, NOT forwarding because T is not
                     //  a template parameter of the function foo, but rather
                     //  of the enclosing class.
};
```

#### Reference collapsing

To understand why perfect forwarding works, we first look at what happens when we take a reference to a reference. This
can't be done directly, but with `using`:

```cpp
#include <type_traits> // std::is_same_v<U, V>

using lref = int&;
using rref = int&&;

static_assert(std::is_same_v<lref&, lref>); //  (int&)&   is int&.
static_assert(std::is_same_v<lref&&, lref>); // (int&)&&  is int&.
static_assert(std::is_same_v<rref&, lref>); //  (int&&)&  is int&.
static_assert(std::is_same_v<rref&&, rref>); // (int&&)&& is int&&.
```

The rule is simple: only an rvalue reference to an rvalue reference is an rvalue reference, all other combinations are
lvalue references (you can think of this using boolean and/ors).

These collapsing rules explain why universal references work — suppose we have a function with a forwarding reference as
a parameter:

```cpp
template <typename T>
void f(T&& val)
{
    std::forward<T>(val);
}
```

If we call `f` with an lvalue expression (e.g., `int x = 0; f(x);`), the only way to make the parameter `val` an lvalue
reference is to deduce `T = int&`:

```cpp
template <>
void f<int&>((int&)&& val)
{
    std::forward<int&>(val);
}

// which, by reference collapsing, is equiv. to:
template <>
void f<int&>(int& val)
{
    std::forward<int&>(val);
}
```

Otherwise, if we call `f` with an rvalue expression (e.g., `f(5);`), the *simplest* way to make the parameter `val` an
rvalue reference is to deduce `T = int`:

```cpp
template <>
void f<int>((int)&& val)
{
    std::forward<int>(val);
}

// which is trivially
template <>
void f<int>(int&& val)
{
    std::forward<int>(val);
}
```

Observe the distinction in the two cases: if we pass an lvalue expression to a universal reference, the template type
parameter is deduced as an lvalue reference. If we pass an rvalue expression, the template type parameter is deduced to
the base type (without a reference). The implementation of `std::forward<T>` takes advantage of this fact.

#### Reference removal

In the `<type_traits>` header, the STL defines a type trait struct, `std::remove_reference<T>` which is defined like so:

```cpp
template <typename T>
struct remove_reference { // (1)
    using type = T;
};

template <typename T>
struct remove_reference<T&> { // (2)
    using type = T;
};

template <typename T>
struct remove_reference<T&&> { // (3)
    using type = T;
};

template <typename T>
using remove_reference_t = typename remove_reference<T>::type;
```

When you instantiate `std::remove_reference<int&&>`, it can only bind to the primary template (1) and the rvalue
reference specialization (3) — note an rvalue reference cannot bind to a non-const lvalue reference (2). To determine
which template is instantiated, it chooses the “most specific” match, which is 3. Thus, `remove_reference<int&&>::type`
is `int`.

Convince yourself that the above definition always yields the original type with any outer references removed.

#### Definition of std::forward

The following is a simplified definition of `std::forward`:

```cpp
template <typename T>
T&& forward(std::remove_reference_t<T>& val) // overload (a)
{
    return static_cast<T&&>(val);
}

template <typename T>
T&& forward(std::remove_reference_t<T>&& val) // overload (b)
{
    return static_cast<T&&>(val);
}
```

We can finally see what happens when we call `std::forward` in the two cases above. Suppose we called into `f` with an
lvalue expression of type `int&`. Above, we deduced that `T = int&`. Since we call `std::forward<int&>(val)`, where
`val` is a named lvalue reference, overload (a) is called above and it simplifies to:

```cpp
template <>
(int&)&& forward<int&>((int)& val)
{
    return static_cast<(int&)&&>(val);
}

// which, by reference collapsing, is:
template <>
int& forward<int&>(int& val)
{
    return static_cast<int&>(val);
}
```

hence returning an lvalue reference, as desired.

If above we called into `f` with an rvalue expression of type `int&&`, we deduced earlier that `T = int`. In this case,
`std::forward<int>(val)` has argument `val`, a named rvalue reference (hence an lvalue expression), and overload (a) is
called again:

```cpp
template <>
(int)&& forward<int>((int)& val)
{
    return static_cast<(int)&&>(val);
}

// which trivially simplifies to:
template <>
int&& forward<int>(int& val)
{
    return static_cast<int&&>(val); // <- this is just a move.
}
```

which casts to an rvalue reference, as desired.

Hence, `std::forward<T>`, where `T` is the deduced type of a universal reference, always passes rvalue expressions by
rvalue reference (i.e., moves), and always passes lvalue expressions by lvalue reference. In the above, overload (b) is
only called when you directly pass an rvalue expression into `std::forward`.
