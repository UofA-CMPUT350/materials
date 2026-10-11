# Lab 7 Prep Problems

Author: Daniel Zhang

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-7-prep"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Template metaprogramming (TMP)

*Note: This topic is very deep, and this tutorial should not be considered comprehensive.*

**TL;DR**: For a first read, go through everything but SFINAE. For the sake of the problems, prioritize the
intro, then sections [What is constexpr?](#what-is-constexpr), [A first look at compile-time computation](#a-first-look-at-compile-time-computation), 
[Operating on types](#operating-on-types), and [Variadic templates](#variadic-templates).

The ability to instantiate and specialize templates at compile-time in C++ leads to a very rich system which
is able to perform **compile-time computation** *with types*. This is called template metaprogramming (TMP).
Intuitively speaking, you can form an analogy between template metaprogramming and “normal” computational
systems as follows:

- *Data*: Types, as well as a restricted set of specific values such as instantiations of integral types (`int`, `bool`,
  `char`), enumerations, etc..
- *Functions*: Type templates, which can take *data* as compile-time arguments via its template parameters,
  and can return *data* with types aliased in its namespace (via `using`) and value instantiations (via
  `static constexpr` members).
- *Conditionals*: Achieved via template specialization. If more than one template specialization exists which
  can take a set of arguments, the “most specific” one is chosen.
- *Iteration*: Achieved via recursive template instantiation. We will see an example shortly.

Since types remain fixed and any non-type template parameters must remain constant, *data* is effectively
immutable in the template metaprogramming system (what would it mean to *mutate* the `std::vector<int>` type
to a `std::vector<float>` type?). Therefore, recursion must be used rather than iteration, and notions of *state* must
be passed as explicit parameters rather than as mutable context. In TMP, there are no side
effects, hence TMP is effectively a form of functional programming. In fact, it is Turing complete — anything
which is computable can be computed, in principle, at compile-time via C++ templates.

### What is `constexpr`?

The `constexpr` keyword means “constant expression”. It signifies that the expression represented can be
evaluated at compile time. `constexpr` can be applied to both variables and functions. A `constexpr` variable
is necessarily constant throughout the runtime of the program. For example:

```cpp
constexpr double SOME_CONSTANT = 3.14159;
```

Everything on the right-hand-side of the initialization of a `constexpr` variable must be a constant
expression. This is, roughly, a combination of literals, other `constexpr` variables, calls to `constexpr` or
`consteval` functions, whose arguments must themselves be constant expressions. A `const` variable can depend
on runtime variables, e.g.,

```cpp
void foo(int x) {
    const int y = x + 1; // valid
}
```

But a `constexpr` variable cannot:

```cpp
void foo(int x) {
    constexpr int y = x + 1; // INVALID!
}
```

`constexpr` functions are covered in section [constexpr functions](#constexpr-functions).

### A first look at compile-time computation

Suppose we want to naively compute the factorial of a number $N$ **at compile time**:

$$
N! = N \times (N-1) \times \dots \times 2 \times 1
$$

#### Data

C++ admits a restricted set of values which can be used as *non-type template parameters*. The most commonly
used are integral types. In this example, our “data” will be a `int` non-type template parameter.

#### Functions

Following our analogy above, let's make a compile-time “function”, `Factorial<N>`:

```cpp
template <int N>
struct Factorial;
```

Inside of it we need to define a return value as a `static constexpr`. By convention we'll call this `value`:

```cpp
#include <cstdint> // uint64_t

template <int N>
struct Factorial {
    static constexpr uint64_t value = /* ... */;
};
```

Here, `static` means that the value is shared class-wide, as opposed to per-object. Again, `constexpr`
signifies *constant expression* — essentially, that the value of the expression on the right can be evaluated
at compile-time.

#### Iteration

Well, we know that for $N > 0$, $N! = N \times (N-1)!$, and we can achieve this “iteration” over
$N, N-1, N-2, \dots$ via recursive template instantiation:

```cpp
template <int N>
struct Factorial {
    static constexpr uint64_t value = N * Factorial<N - 1>::value;
};
```

#### Conditionals

But we still need to check the *condition* that $N = 0$, or else the above will infinitely recurse
down to $-\infty$ (well, really `INT_MIN`, but you will run out of recursion depth long before then).

We can achieve “conditionals” via a template specialization. Here we can do a *full* template specialization
by having a custom result for a specific instantiation of all template parameters:

```cpp
// The "primary template" -- the most general version
template <int N>
struct Factorial {
    static constexpr uint64_t value = N * Factorial<N - 1>::value;
};

// Explicit/full template specialization: must use template<>:
template <>
struct Factorial<0> { // <-- and then specify exactly which template args this applies to
    static constexpr uint64_t value = 1; // 0! = 1.
};
```

If a specific template instantiation satisfies more than one specialization, the “most specific” one is
chosen. If a partial ordering cannot be established between multiple specializations (i.e., more than one can
be considered “most specific”), this is a compilation error. Hence, `Factorial<0>` will always choose the full
template specialization over the primary template. This ends the recursion.

#### Assertions

One last thing — we need to handle negative inputs. A compile-time assertion can be done using `static_assert`
(of course, whatever boolean expression you pass into it must be `constexpr`):

```cpp
template <int N>
struct Factorial {
    static_assert(N >= 0, "N must be nonnegative.");
    static constexpr uint64_t value = N * Factorial<N - 1>::value;
};

// Explicit/full template specialization: must use template<>:
template <>
struct Factorial<0> { // <-- and then specify exactly which template args this applies to
    static constexpr uint64_t value = 1; // 0! = 1.
};
```

We could've also just chosen to use `template <unsigned int N>`.

Note that `static_assert`s within templates are only evaluated upon instantiation of the template with a
specific list of template arguments, with one exception: if the `static_assert`'s condition is not at all
dependent on the template parameters, the compiler can evaluate it regardless of whether the template is
instantiated.

#### How it works

So how do we use this? Consider the following:

```cpp
#include <iostream>

// ... Factorial def'n as above...

int main() {
    std::cout << Factorial<5>::value << '\n';
}
```

This outputs, as you'd hope:

```text
120
```

But if you timed this code, the time would remain constant on average (accounting for variance across runs)
regardless of what value you changed the input to, because the computation happens at compile time. When you
use `Factorial<5>::value`, the `Factorial` template is instantiated **at compile time**, generating code for
`Factorial<5>`. Then the `Factorial<4>` type is needed in the definition of `Factorial<5>::value`, so code is
generated for `Factorial<4>` (still at compile time). This process continues until you reach `Factorial<0>`,
which doesn't cause the instantiation of any more templates. Finally, the value of `Factorial<N>::value` is
just directly stored in the corresponding `static` members of each class instantiation for $N = 0, \dots, 5$. In
effect, you have saved on runtime computation, and the price you pay is that your compilation takes longer.

As a practical note, factorial quickly outpaces $2^n$. This means that it doesn't take a
particularly large input to outgrow the maximum size of a `uint64_t`
($64! > 2^{64} > 2^{64} - 1 = \texttt{UINT64\_MAX}$ ). Thus you would have
to implement an arbitrary-precision integer class with `constexpr` constructor and methods to get higher
results at compile-time.

### Operating on types

In the previous example, we saw an instance of something that was effectively a compile-time “function” on
integers. In this example, we'll consider a “function” that maps types to types. Let's implement
`RemoveReference<T>`, which takes a type `T` and, through an aliased name in its namespace, returns `T` with
any outer references removed. By convention, we'll call this type `type`. For example, given `T` as `int&&`,
`RemoveReference<int&&>::type` is the type `int`.

```cpp
template <typename T>
struct RemoveReference {
    using type = T;
};
```

Let's start with this. This just directly returns the original `T`. This is fine when `T` actually isn't a
reference type, but to actually handle reference type, we need *partial template specialization*:

```cpp
// Primary template
template <typename T>
struct RemoveReference {
    using type = T;
};

// Partial template specialization for lvalue references
template <typename T>
struct RemoveReference<T&> { // <-- partial template specialization must specialize a template arg
    using type = T;
};

// Partial template specialization for rvalue references
template <typename T>
struct RemoveReference<T&&> { // <-- partial template specialization must specialize a template arg
    using type = T;
};
```

Partial template specializations, unlike full template specializations, can still take template parameters.
Like explicit/full template specializations, you still need to show what types you are ultimately feeding into
the “primary template” so that the compiler knows which instantiations should use the specialization. For
example, consider the following:

```cpp
// Primary template
template <typename T, typename U>
struct IsSame {
    static constexpr bool value = false;
};


// Partial template specialization
template <typename T>
struct IsSame<T, T> {
    static constexpr bool value = true;
};
```

You might believe, from your past experience with templates, that `IsSame<int>` should instantiate the partial
template specialization, because it matches up with the singular template parameter. **But this is incorrect**
— the matching is done with respect to the primary template parameter list, so `IsSame<int>` just won't
compile. Instead, `IsSame<int, int>` will match against both the primary template and the partial template
specialization (and choose the more specific specialization such that `IsSame<int, int>::value == 1`).

Finally, partial template specializations cannot feed in identical template args as the primary template --
they must specialize something. In the above, the partial specialization of `RemoveReference<T&>` matches
specifically lvalue references, and `RemoveReference<T&&>` matches specifically rvalue references.

#### Names nested inside dependent names

Consider the following:

```cpp
void foo() {
    RemoveReference<int&&>::type x = 5; // equivalent to 'int x = 5;'
}
```

This is fine. But how about this function template:

```cpp
template <typename T>
void foo() {
    RemoveReference<T&&>::type x;
}
```

This actually fails to compile, because `type` is a named *nested within a “dependent name”*. A dependent name
is any name (whether type, function, variable) which depends on a template argument. The issue is that when
you have a dependent name (here, `RemoveReference<T&&>`) there's no guarantee that a name that's nested inside
of it (here, `type`) actually refers to either a type name or a `static` data field name. For example, in the
following (invalid code):

```cpp
struct A {
    static constexpr int type = 5;
};

struct B {
    using type = int;
};

template <typename T>
void bar() {
    T::type x;
}

int main() {
    bar<B>(); // this *would* be fine, because 'T::type x' resolves to 'int x'
    bar<A>(); // 'T::type x' resolves to '5 x', which makes no sense
}
```

Because of this ambiguity, C++ by default will assume names nested inside dependent names are not types. To
reassure the compiler that a name nested inside a dependent name is a type, you must prefix the name with
`typename`:

```cpp
template <typename T>
void bar() {
    typename T::type x; // We reassure the compiler that the name 'T::type' is indeed a typename.
}
```

Completing our original example, this works:

```cpp
template <typename T>
void foo() {
    typename RemoveReference<T&&>::type x;
}
```

#### Type traits

The standard library provides, in the `<type_traits>` header, *type traits*, which are just templated types
which take in some types as template arguments, and either give a resultant value or type. Generally, type
traits help you inspect/modify types. One example is `std::remove_reference<T>`, which implements exactly what
we implemented above in `RemoveReference<T>`, and similarly has a `std::remove_reference<T>::type` “returned”
type. Another is `std::is_same<T, U>`, which is exactly the same as our `IsSame<U, V>`. A few other useful
examples:

- `template <typename T> std::remove_const`, whose `::type` nested type gives `T` without any outer
  `const`s.
- `template <bool B, typename T> std::enable_if`, which has a member typedef `::type` if `B` is `true`, else,
  no member typedef exists. This is useful for conditional compilation of template overloads, as we cover in
  section [Substitution Failure Is Not An Error (SFINAE)](#substitution-failure-is-not-an-error-sfinae).
- `std::conditional<bool B, typename T, typename F>`, whose member typedef `::type` is exactly `T` if
  `B == true` and else `::type` is exactly `F`.
- and [many more!](https://en.cppreference.com/w/cpp/header/type_traits.html)

#### Aliases for nested types and static data fields

It's a bit of a hassle to always write out `MyTemplate<T>::value` or `typename MyTemplate<T>::type`. In the
standard library, the following convention is used: for nested values, it defines an extra template *variable*
that has the original type trait's name, suffixed with `_v`. For nested types, we define an extra alias
template that has the original type trait's name, suffixed with `_t`. For example:

```cpp
namespace std {

// Note that we don't have to do partial template specialization here, since
// that is automatically handled by remove_reference<T>. Furthermore, the definition
// here is just to show you the implementation -- the standard library gives this to you!
template <typename T>
using remove_reference_t = typename remove_reference<T>::type;

}

// now these are the same:
std::remove_reference_t<int&&> x = 5;              // (1) int x = 5;
std::remove_reference<int&&>::type x = 5;          // (2) int x = 5;
```

In fact, with this convention, you don't need to directly use the `typename` keyword. This is probably the
biggest win that these aliases give us:

```cpp
template <typename T>
void foo() {
    // Still a dependent name, but not a name nested inside another dependent name,
    // so 'typename' not required!
    std::remove_reference_t<T&&> x;
}
```

Similarly, for type traits which return values:

```cpp
namespace std {

template <typename T, typename U>
constexpr bool is_same_v = is_same<T, U>::value;

}

// now these are the same:
bool result = std::is_same_v<int, bool>;        // (1) bool result = false;
bool result = std::is_same<int, bool>::value;   // (2) bool result = false;
```

### What does it mean for a specialization to be “more specific”?

In our first example, we showed an instance of “full template specialization”, where, if an exact combination
of template arguments are passed to our template, a specific instantiation is created. In our second example,
we showed a less restrictive example, “partial template specialization”, which can still take some template
parameters, but specializes them, passing specific modifications of them as arguments to the primary template.

Roughly, one template specialization is “more specific” than another if it admits a strict subset of the
possible types that the other specialization does. For example, in our definition of
`template <typename T, typename U> struct IsSame`, the primary template admits all possible types for both `T`
and `U`, while the partial specialization `template <typename T> struct IsSame<T, T>` only admits the subset
of all pairs of types where the first and second match. Hence the latter is “more specific”.

If a partial ordering cannot be formed between specializations, then we give up and say the template
instantiation is ambiguous. This is a compilation error.

### Some notes on template specialization

- Type templates (e.g. `template <typename T> class C;`) can be either partially or fully specialized.
- Variable templates (e.g. `template <typename T> constexpr T PI;`) can be either partially or fully
  specialized.
- Function templates (e.g. `template <typename T> void f(T x);`) cannot be partially specialized, only fully
  specialized.
- Alias templates (e.g. `template <typename T> using Pointer = T*;`) cannot be partially specialized, nor
  fully specialized.

### Variadic templates

Variadic templates match against arbitrary lengths of template arguments (including 0-length). They look like:

```cpp
template <typename... Ts>
struct S {
    std::tuple<Ts...> elems; // pack expansion, equivalent to std::tuple<T1, T2, ..., TN> elems;
};
```

How do you write “functions” on variadic lists (i.e., templates which process the list and “return”
something)? We make use of partial specialization again. Here's an example with a variadic non-type template
parameter pack:

```cpp
// Primary template is least specific, we'll use it to cover an "empty" list (base case).
template <int... Elems>
constexpr int product = 1;

// Partial specialization is more specific for all lists of size at least 1,
// (because it can't handle empty lists), hence it is used in the recursive case:
template <int Elem, int... Elems>
constexpr int product<Elem, Elems...> = Elem * product<Elems...>;

// this gives 120:
std::cout << product<1, 2, 3, 4, 5> << '\n';
```

The important part is that the primary template is used as a base case here, because it matches *all* lists,
it is less specific than the partial specialization, which only handles all lists of size 1 or more. Remember
that the most specific applicable template is always chosen.

The same logic applies to variadic lists of types:

```cpp
// base case, handles empty list.
template <typename... Ts>
struct X {
    // do some simple calculation here...
};

// recursion case, handles all lists of size >= 1.
template <typename T, typename... Ts>
struct X<T, Ts...> {
    // do some recursive calculation here...
};
```

#### Tail recursion vs head recursion

Sometimes it's helpful to make a helper type that does things in a tail-recursive manner, so you can *accumulate* and
remember results by the time of the base case. Here' our head-recursive product from above
again:

```cpp
// Primary template is least specific, we'll use it to cover an "empty" list (base case).
template <int... Elems>
constexpr int product = 1;

// Partial specialization is more specific for all lists of size at least 1,
// (because it can't handle empty lists), hence it is used in the recursive case:
template <int Elem, int... Elems>
constexpr int product<Elem, Elems...> = Elem * product<Elems...>;
```

Here's a tail-recursive implementation:

```cpp
// Tail-recursive helpers:

// Primary template is least specific, we'll use it to cover an "empty" list (base case).
template <int Accumulated, int... Elems>
constexpr int _product = Accumulated;

// Partial specialization is more specific for all lists of size at least 1,
// (because it can't handle empty lists), hence it is used in the recursive case:
template <int Accumulated, int Elem, int... Elems>
constexpr int _product<Accumulated, Elem, Elems...> = _product<Accumulated * Elem, Elems...>;

// Actual product:
template <int... Elems>
constexpr int product = _product<1, Elems...>;
```

Notice the extra `Accumulated` template parameter. Accumulators are a common idiom in functional programming
to emulate mutable state passing.

In **runtime** functional programming, tail-recursion allows for “tail call optimization”, which means child
stack frames are not added on the recursion step because the parent stack frame is no longer needed once the
recursion happens. This means tail-call optimization may allow for deeper recursion. However, in the case of
C++ templates, each recursive instantiation just generates a new type at compilation (e.g., the head recursion
above generates `product<1, 2, 3, 4, 5>`, `product<2, 3, 4, 5>`, `product<3, 4, 5>`, `product<4, 5>`,
`product<5>`, `product<>`). Hence, head recursion allows for “memoization”, which is more difficult with tail
recursion (try working out the types generated by our tail-recursive solution).

### Substitution Failure Is Not An Error (SFINAE)

Have you ever been annoyed that your type template parameters can take *any* type? Sometimes you want to be
able to assume things about your types so you have guarantees that e.g., they have certain methods you can
call. Other times, you want to write multiple versions of your templates, depending on if the template
parameter is one type or another.

SFINAE is a rule of C++ that allows for conditional compilation and the selective removal of template
overloads, depending on your template type arguments. Essentially, SFINAE states the following: if `t` is a
type, you have some template (class, function, etc...) `template <typename T> ...`, and substituting `T = t`
results in an invalid substitution in the **immediate context of the (class, function, etc...) template
declaration** then this is not a compilation error — the corresponding template instantiation is just not
considered in overload resolution.

- For function templates, SFINAE applies to substitutions in the return type, function parameter list, or
  template parameter types.
- For class templates, SFINAE applies to substitutions in the template parameter types, the base class
  specification, and data members.
- This means, notably, that substitution failures in the **body** of a function template are not eligible for
  SFINAE — these are just hard errors.

#### Type SFINAE

Type SFINAE refers to the fact that, if you substitute your template args `T = t` and get an
invalid/nonexistent type somewhere in your immediate context (e.g., if you use `T::type` in a function
signature, but `t` has no nested type `t::type`), then that particular template instantiation is simply
ignored.

Type SFINAE is commonly exploited via `std::enable_if`. Here's an implementation:

```cpp
// Primary template
template <bool B, typename T = void>
struct enable_if {};

// Partial specialization
template <typename T>
struct enable_if<true, T> {
    using type = T;
};

// Alias for the 'returned' type:
template <bool B, typename T = void>
using enable_if_t = typename enable_if<B, T>::type;
```

We can use `enable_if_t` to only enable a specific template instantiation based on some condition on the
template parameters, by making the the class/function's body rely on the type `T`. Consider the following:

```cpp
template <typename T>
std::enable_if_t<std::is_floating_point_v<T>, T> foo(T x) {}
```

When you instantiate the above with `T = int`, this then this becomes:

```cpp
template <>
std::enable_if_t<std::is_floating_point_v<int>, int> foo(int x) {}
```

and then, since `std::is_floating_point_v<int> == false`,

```cpp
template <>
std::enable_if_t<false, int> foo(int x) {}
```

since `std::enable_if<false, int>` does not have a `::type` nested type, `std::enable_if_t<false, int>` does
not yield a type, hence this template instantiation does not yield a valid function (as there is no return
type). SFINAE guarantees that instead of a compiler error, this overload is just not considered. You can
exploit this to write different versions of a function depending on the template parameters:

```cpp
template <typename T>
std::enable_if_t<std::is_floating_point_v<T>, T> foo(T x) { // (1)
    /* do something if T is floating point */
}

template <typename T>
std::enable_if_t<std::is_integral_v<T>, T> foo(T x) { // (2)
    /* do something else if T is integral */
}
```

Thus, calling `foo(5)` will cause overload resolution on both versions (1) and (2), but you get a substitution
failure on (1) because `std::is_floating_point_v<T>` is `false`, hence `std::enable_if` does not have a
`::type` member. Overload (2) is thus the only remaining overload, which works, and is hence selected.

Another way to do this is to just add a defaulted non-type template parameter that relies on
`std::enable_if_t`, like:

```cpp
// if T is floating point, an unnamed non-type template parameter of type bool is set to true,
// which is valid.
// If T is not floating point, then we just have no type on the LHS of the equality,
// which is invalid; SFINAE guarantees that this overload is simply not considered.
template <typename T, std::enable_if_t<std::is_floating_point_v<T>, bool> = true>
T foo(T x) {
    /* do something if T is floating point */
}
```

#### Expression SFINAE

Expression SFINAE refers to the fact that, if you substitute your template args `T = t` and get an
invalid/nonexistent expression somewhere in your immediate context then that particular template instantiation
is ignored. For example:

```cpp
template <typename T>
void foo(){
    x;          // assumes the substituted T = t can be default-constructed
    x.print();  // assumes T = t has a method or static method called 'print' which takes no args.
}
```

In the above, `T` is assumed to be default-constructible, and that it has a `print()` method or static method.
If either of these expectations are violated for a given `T = t`, then a hard error would be generated above.

Expression SFINAE is often invoked via `decltype(/* some expression */)`. `decltype` takes an expression, and
“returns” the *type* of the expression. This is done **at compile time**, and **the expression is not actually
evaluated**.

Suppose for example we want to write a generic adder function, which can take any two args (possibly of
different types!) and return the result of adding the first with the second, which can also be of arbitrary
return type depending on how `operator+` was defined. Here's a first **incorrect** attempt:

```cpp
// Using decltype(first + second) should give us the correct return type,
// but the names 'first' and 'second' are not even in scope yet when we've used it
// for the return type!
template <typename T, typename U>
decltype(first + second) add(const T& first, const U& second) {
    return first + second;
}
```

To fix this, we need *trailing return type syntax*:

```cpp
template <typename T, typename U>
auto add(const T& first, const U& second) -> decltype(first + second) {
    // if first + second is an invalid expression, only the failure in the above decltype
    // is eligible for SFINAE; the return below would otherwise just cause a hard error.
    return first + second;
}
```

Here, expression SFINAE guarantees that the function template will not be instantiated if the arguments you
pass in cannot actually be added. This has the effect of *restricting your template* to only types which can
be added.

Expression SFINAE can be used to enforce that your template type arguments satisfy certain interfaces at
compile time. The above example ensures `first` and `second` can be added. Here's another example, that
ensures that a given type has a `print()` method:

```cpp
template <typename T>
auto foo(const T& x) -> decltype(x.print(), int()) {
    x.print();  // x is guaranteed to have print() method.
    return 5; // decltype gives the return type int, if x has print().
}
```

In the above, the comma operator evaluates the left hand side, then the right hand side, and then only returns
the result of the right hand side. If `x.print()` is invalid, then this expression is ill-formed, hence
invoking SFINAE by discarding the overload. Otherwise, `x.print()` exists, an `int` is default-constructed,
and then `decltype` gives the type `int` as the return type.

## Modern compile-time programming in C++

“Traditional” template metaprogramming can be a bit cumbersome. Errors that arise from compile-time template
instantiation can often be verbose, and can be hard to read to deduce the actual cause of bugs. As we saw
earlier, SFINAE can involve convoluted ways of invoking substitution failure to mask out certain template
instantiations, and to thus cause the behaviours/idioms we are used to seeing in regular programming.
Thankfully, modern C++ has added more and more features which allow compile-time code to look a lot more like
runtime C++.

### constexpr functions

C++11 introduced `constexpr` functions, which are functions which *have the potential* to be run at
compile-time — specifically, when all of their arguments are constant expressions. If any argument is not a
constant expression, the function is evaluated at runtime. A `constexpr` function will yield a compiler error
if you call it in a context requiring a constant expression, but e.g., you passed it runtime arguments, if it
itself calls a non-`constexpr` function, etc..

Since C++14, `constexpr` functions support loops like `for`, `while`, and `do`-`while`. You can also allocate
stack variables in `constexpr` functions:

```cpp
// Leibniz formula
constexpr double calculatePi(size_t nTerms) {
    double piOver4 = 0;
    double sign = 1;
    for (size_t i = 0; i < nTerms; ++i) {
        piOver4 += sign / (2 * i + 1);
        sign = -sign;
    }
    return piOver4 * 4;
}

constexpr size_t N_TERMS_FOR_PI = 100000;

constexpr double PI_APPROX = calculatePi(N_TERMS_FOR_PI); // calculates at compile-time.
```

Since C++20, you can call `new` in `constexpr` functions, but the allocation must be deleted by the end of the
function.

Here's our factorial example, using a `constexpr` function:

```cpp
#include <cstdint>

template <int N>
constexpr uint64_t factorial() {
    static_assert(N >= 0);
    uint64_t ret = 1;
    for (int i = N; i > 1; --i) {
        ret *= i;
    }
    return ret;
}

constexpr uint64_t FACTORIAL_FIVE = factorial<5>();
```

### if constexpr

`constexpr` functions support regular `if`-statements, but this can have issues if it ends up compiling
invalid code in one branch. For example:

```cpp
template <typename T>
constexpr void foo(const T& x) {
    if (std::is_same_v<T, MyBarType>) {
        x.bar(); // let's say MyBarType has method bar()
    } else {
        // do nothing
    }
}
```

What we wanted to say was, at compile-time, determine if `x` is of a type that supports some special
functionality (here, a `bar` method). If it is, call that functionality, else don't. But this is problematic
because regardless of `T`, *both branches are compiled*, meaning we try to compile `x.bar()` even if `x` does
not support it. This was one of the things SFINAE handled for us — conditional compilation. Since C++17, we
can also achieve conditional compilation with `if constexpr`:

```cpp
template <typename T>
constexpr void foo(const T& x) {
    // This condition is evaluated at compile-time!
    if constexpr (std::is_same_v<T, MyBarType>) {
        // This branch only gets COMPILED if T is MyBarType.
        x.bar();
    } else {
        // do nothing
    }
}
```

Remember our floating-point versus integral type SFINAE example from [Type SFINAE](#type-sfinae)? We can do
the same with `constexpr` functions and `if constexpr`:

```cpp
template <typename T>
constexpr T foo(T x) {
    static_assert(
        std::is_floating_point_v<T> || std::is_integral_v<T>,
        "x must be floating or integral");
    if constexpr (std::is_floating_point_v<T>) {
        /* do something if T is floating point */
    } else {
        /* do something else if T is integral */
    }
}
```

## Problems

1. *Type packs.* Consider the following template type:

   `template <typename... Ts> struct Pack`

   which has no non-static data fields. A `Pack` represents a (lightweight) sequence of types that allows us
   to make queries mapping indices $\leftrightarrow$ types. To accomplish this, write a `pack_detail`
   `namespace` (that doesn't contain `Pack` itself), and **inside of it** implement these three fundamental
   queries, using template metaprogramming:

    1. *Size.* the *variable template*:

       `template <typename... Args> constexpr int packSize;`

       which just gives the number of types contained in `Args...`.

    2. *Index to type.* the *type template*:

       `template <int QueryIndex, typename... Args> struct _packIndexToType;`

       which, given an index and a variadic list of types, returns the `QueryIndex`'th `Arg` (0-indexed), in
       a nested `type` member. Think about restrictions on `QueryIndex` and how you can enforce them (hint:
       consider `requires`, SFINAE, or `static_assert`).

       Once this is implemented, we can create a convenience alias for the nested type like so:

       `template <int QueryIndex, typename... Args> using packIndexToType = typename _packIndexToType<QueryIndex, Args...>::type;`

       like we covered in section [Aliases for nested types and static data
       fields](#aliases-for-nested-types-and-static-data-fields). We can't implement the original
       problem directly as an alias template, because alias templates cannot be partially, nor fully,
       specialized.

    3. *Type to index.* the *variable template*:

       `template <typename QueryType, typename... Args> constexpr int packTypeToIndex;`

       which, given a `QueryType` and a variadic list of types, stores the **first** index at which
       `QueryType` occurs. If it never occurs, store `-1`.

       You may find it helpful to write a helper,

       ```cpp
       template <int Accumulated, typename QueryType, typename... Args>
       constexpr int _packTypeToIndex;
       ```

       which operates in a tail-recursive style.

   Our packs will never be significantly large, so `int` is fine for keeping our lab simple, and it avoids
   sign conversion issues.

   Note — to be clear, the above are the *primary templates*. You will almost certainly need to write
   specializations as well.

   Once you've implemented the above in the `pack_detail` `namespace`, it'd be cool if we didn't have to
   rewrite `Args...` everywhere manually and instead use static fields on the `Pack` itself. implement the
   following which directly use your previous work:

    4. A `static` variable, `int size`, nested inside `Pack`. This must be known at compile time.
    5. A nested type alias template, `template <int QueryIndex> using type = /* ... */`, which gives the
       `QueryIndex`'th type.
    6. A nested `static` variable template,
       `template <typename QueryType> constexpr static int index = /* ... */`, which gives the first index at
       which `QueryType` appears in the pack.

2. *Variadic pack expansion.* Suppose we are in some function body with a variadic template
   `template <typename... Args>`, and with corresponding function parameters `Args... args`. In this case,
   `Args...` expands as `Arg1, Arg2, ..., ArgN`, and `args...` expands as `arg1, arg2, ..., argN`. What do
   the following expand into?
    1. `std::forward<Args>(args)...`
    2. `(f(args) + 1)...`
    3. `std::tuple<Args...>`
    4. `std::tuple<std::vector<Args>...>`

3. *Dense vs sparse mapping*. Suppose you have $N$ “entities”, where $N$ can change
   at runtime, and $K$ “component types”, where $K$ is fixed at compile time. Each
   entity can instantiate any subset of the $K$ component types, which increases the total number
   of each (instantiated) specific component type by 1. We thus need a way to map an entity ID (usually just
   a number) to a component index (also just a number), for each component type.

   Consider the pros and cons of each of these following strategies, in terms of:

    1. Total memory cost
    2. Speed of access, considering both Big-$O$ and constant factors induced by e.g.,
       cache-friendliness.
    3. Difficulty of maintenance, e.g., if entities get added/removed, or if component instantiations are
       added/removed at runtime.

    - A `std::unordered_map<EntityID, int32_t> m`, i.e., a hash table, generally implemented as a vector of
      linked lists. One of these maps exists for each component type; the resulting output from indexing
      `m[entityID]` is a nonnegative index corresponding to the entity's component index in some vector.
    - A `std::map<EntityID, int32_t> m`, generally implemented as either a red-black tree or an AVL tree. One
      of these maps exists for each component type; the resulting output from indexing `m[entityID]` is a
      nonnegative index corresponding to the entity's component index in some vector.
    - A `std::vector<std::array<int32_t, K>> m`, a sparse mapping of size `[N][K]`. Here, an entity has a
      component type if `m[entityID][componentTypeIdx] != -1`.
    - A `std::array<std::vector<int32_t>, K> m`, a sparse mapping of size `[K][N]`. Here, an entity has a
      component type if `m[componentTypeIdx][entityID] != -1`.
