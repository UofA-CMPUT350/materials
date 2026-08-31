# C++ Notes

*Author: Daniel Zhang*

*Work in Progress. Last updated Sept 3rd 2025.*

## Object-Oriented Programming

### Abstraction

Object-oriented programming (OOP) is a paradigm which allows programmers to create modular and extensible <u>abstractions</u> of types which are able to dynamically act like their specific forms. Fundamentally, the emphasis is that OOP is a facility for creating abstractions.

What is abstraction? Abstraction occurs whenever you filter out irrelevant/unimportant information to focus on a smaller set of things which you can easily reason about. When cooking using the same ingredients, you don’t worry about which *specific* farm your chicken came from when determining the cooking temperature and time — they’ll be the same as the last time. When making your way to the university, you know that the path you’ll take will be roughly the same, regardless of if it’s on a Tuesday or a Thursday. When you call `sort`, it doesn’t *usually* matter under the hood whether it uses quicksort or mergesort, as long as it sorts your data correctly. These are all examples of abstractions which allow you to *avoid depending on irrelevant data*<sup><a href="#footnote1" id="footnoteret1" class="footnoteret">[1]</a></sup>.

The value of abstraction is derived from the fact that there is *consistent structure* in the universe; that things which have surface-level differences often still have a *deep sharedness*. Abstraction is what allows us to *generalize knowledge*, and through that generalization, we *compress* data.

The point of this general and semi-philosophical discussion on abstraction is that all of these points are what make OOP useful for programmers. By facilitating the abstraction of types, we can *compress programs* by taking advantage of shared structure in different data types. We can avoid rewriting the same logic for similar but different things because we can reuse, extend, and instantiate written modules. This modularity also allows us to organize and compartmentalize our programs. By depending on abstracted types, we can avoid unnecessary code *dependencies* (i.e., avoid *tight coupling*) on irrelevant details of specific versions of those types. Finally, having abstracted types allows us to write maximally general code, making our programs easily extensible.

<span id="sec_1_2"></span>

### A small motivating example

Suppose you have two shape types, `Circle` and `Rectangle` (to keep things self-contained, we avoid using `sf::Vector2f`):

```cpp
struct Circle {
    float posX;
    float posY;
    float radius;
};

struct Rectangle {
    float posX;
    float posY;
    float width;
    float height;
};
```

Each shape shares some fields (position), and have a shared functionality (area). Let’s focus on area for now. We can calculate them like so:

```cpp
float area(const Circle& circle) {
    // requires #include <numbers>
    return std::numbers::pi * circle.radius * circle.radius;
}

float area(const Rectangle& rect) {
    return rect.width * rect.height;
}
```

*Note:* These functions have the same name, but different implementations. This is valid because *function overloading* can resolve which version to call at compile-time based on the different parameter types<sup><a href="#footnote2" id="footnoteret2" class="footnoteret">[2]</a></sup>.

**Motivating problems.** In situations like this one, where we have multiple types which have a common functionality, we’d like to:

- *(Interface)* have a generic representation of the shared/underlying abstracted type (here, a shape),
- *(Polymorphism & Method dispatch)* be able to call the specific implementation of the shared functionality on the abstracted type, like `float area(const Shape& shape)`, so we could pass in either a `Rectangle` or a `Circle` and call the correct `area` implementation above.

Here’s a naive way to approach these problems. Define an `enum`:

```cpp
enum ShapeType {
    CIRCLE,
    RECTANGLE
};
```

and switch on the enum to determine how to cast a `const void*`:

```cpp
float area(const void* shape, ShapeType type) {
    // check that the type enum is valid:
    assert(shape.type >= 0); // requires #include <cassert>
    assert(shape.type <= RECTANGLE);
    switch (shape.type) {
    case CIRCLE:
        return area(*static_cast<const Circle*>(shape));
    case RECTANGLE:
    default:
        return area(*static_cast<const Rectangle*>(shape));
    }
}
```

This idea *works* in solving the motivating problems, and it is actually relatively okay when you know from the beginning that you will never want to add more types<sup><a href="#footnote3" id="footnoteret3" class="footnoteret">[3]</a></sup>. However in general, it has many shortcomings:

1.  *Lack of data hiding.* Because we only have free-standing functions, our `struct`s have all of their fields exposed and modifiable by any function, destroying any guarantees we might have about their states.

2.  *Not modular.* While the struct fields are immediately reusable (you can instantiate one type as a field of another), *their functionalities are not*. Suppose we wanted to extend our shapes with colours, like `ColouredCircle` and `ColouredRectangle`. We can easily write

    ``` cpp
    struct ColouredCircle {
        Circle circle;
        Colour colour; // an RGBA struct
    };
    ```

    to reuse the fields of `Circle`, but we would need to duplicate its `area` implementation, and also update the all interface enums (e.g., `ShapeType`) and functions (e.g., `area`). Therefore, we would like to be able to *bundle data with functions that operate on the data* (*encapsulation*) so that we can reuse these bundles (*inheritance*).

3.  *Interfaces depend on concrete implementations.* Here, the generic functions (interface) must be aware of the specific shape types<sup><a href="#footnote4" id="footnoteret4" class="footnoteret">[4]</a></sup>. Since the interface is the most abstracted, simplified version of the concrete shapes, it should be the other way around. We want to *minimize the specificity of our dependencies so that our code is as general and extensible as possible*. By violating this principle, we get the following problem:

4.  *Extension requires modifiability.* Adding a new shape means having to modify the `ShapeType` `enum`, as well as modifying the `area` function to handle a new case<sup><a href="#footnote5" id="footnoteret5" class="footnoteret">[5]</a></sup>:
    - This is extremely cumbersome and prone to error (imagine you had multiple shared functionalities besides `area` — you’d have to edit each one!)
    - You might not even have access to modify the implementation of `area(const void*, ShapeType)`, or of the `ShapeType` enum, if they exist in some linked precompiled library(!)

**TL;DR for all of section [1](#sec_1):** In the following sections, we see how OOP attains our original goals (interfacing and method dispatch), while also solving these above 4 shortcomings of the naive solution. In particular, we will see:

- *Encapsulation*: that types are defined as data-method bundles, and that these are the atomic units upon which we perform abstraction. This solves point 1.
- *Inheritance*: the way in which data-method bundles as a unit can be abstracted and extended, solving point 2 (implicitly together with encapsulation). Inheritance will also solve our original motivating problem of being able to create interfaces.
- *Polymorphism*: the way in which references to abstractions can call the method implementations of their specific forms, solves points 3 and 4 (implicitly together with inheritance).

<span id="sec_1_3"></span>

### Encapsulation

The first and most fundamental pillar of object-oriented programming is that it bundles data (fields/attributes) directly with the functions that operate on that data (methods), and that **both the data and the methods <u>together</u> define the type (and hence the modules to be abstracted)**. The bundling of data together with methods in a single type is called *encapsulation*.

**TL;DR of section [1.3](#sec_1_3):** Encapsulation gives us two immediate benefits. Methods are given privileged access to a class’s data, and therefore we can prevent everyone else from having direct access to our data members (and still have a functioning type). Thus we get:

- *Abstraction from implementation.* By only exposing a public interface of methods, we simplify classes so that the outside world (other classes) only needs to understand the class’s behaviour, and \underline{not} its implementation. This also means that, as long as we keep the same interface, we can modify the implementations of methods without affecting the outside world.
- *Data integrity.* Because we can restrict direct access to class data members, we can ensure that data members always stay in a valid state (e.g., by doing validation checks on setters).

<span id="sec_1_3_1"></span>

#### Data hiding in C versus C++

In C, it is possible to obtain a basic/primitive form of encapsulation, if our concern is only with abstracting away type implementations.

Without encapsulation, in C, you might have something like:

```cpp
typedef struct {
    float posX;
    float posY;
    float radius;
} Circle;

float circle_area(const Circle* circle) { /* as above */ }
```

which still suffers from lack of data hiding — anyone can directly modify a `Circle`’s fields without calling a `circle_*` function. In C, one can instead use opaque pointers to achieve data hiding. In `circ.h`:

```cpp
struct Circle;  // opaque forward declaration, the user has no access to member variables.

// constructor returns opaque pointer:
struct Circle* create_circle(float x, float y, float radius);
// destructor has to call free() at the very least:
void destroy_circle(struct Circle*);


// methods take opaque pointers:
float circle_area(const struct Circle* circle);

// getters/setters here...
```

and in `circ.c`, we can provide the implementations:

```cpp
struct Circle {
    float posX;
    float posY;
    float radius;
};

struct Circle* create_circle(float x, float y, float radius) { /* ... implementation ... */ }
void destroy_circle(struct Circle* circle) { /* ... implementation ... */ }
float circle_area(const struct Circle* circle) { /* ... implementation ... */ }
// getter/setter implementations here ...
```

Hence, C can achieve data hiding on pointers, since the user can only use pointers to `Circle` and not `Circle` itself.

In C++, data hiding can be achieved directly on objects with *access specifiers*:

```cpp
class Circle {
public: // Everything here and below up until 'private:' is accessible by anyone:
    Circle(float x, float y, float radius) : mPosX { x }, mPosY { y }, mRadius { radius } {}
    
    float area() const {
        // A class's methods can always access the class's private members:
        return std::numbers::pi * mRadius * mRadius;
    }

    // getters/setters here...
    
private: // Only accessible within the class and by friends:
    float mPosX;
    float mPosY;
    float mRadius;
};
```

<span id="sec_1_3_2"></span>

#### Member access specifiers and data hiding

Inside a class scope, *access specifiers* define who is able to access any subsequent data members and methods. There are three access specifiers:

- `public` — public members (data & methods) are accessible by anyone.
- `private` — private members of a class are accessible only within same class, and by `friend`s of the class.
- `protected` — protected members of a class are accessible only within the same class, by `friend`s of the class, and by derived classes. We will come back to this when we discuss inheritance, specifically in section [1.4.3](#sec_1_4_3).

The `public` access specifier is the access level you are used to in C. In C++, `struct`s have `public` members by default, and `class`es have `private` members by default (i.e., if you don’t explicitly write `public:` or `private:`).

To understand access specifiers (and specifically `private`), consider the following examples. Suppose we have the following toy class:

```cpp
class FooBar {
public:
    FooBar(int pubVal, int privVal) : publicField { pubVal }, mPrivateField { privVal } {}

    void publicMethod() { /* details unimportant */ }

    int publicField;
private:
    void privateMethod() { /* details unimportant */ }

    int mPrivateField;
};
```

Note that the constructor is public (this is almost always the case, except for rare exceptions), so that anyone (such as `main`) can call it, as well as the other public fields:

```cpp
int main() 
{
    FooBar fooBar(1, 2); // valid
    fooBar.publicMethod(); // valid
    fooBar.publicField += 2; // valid -- now fooBar.publicField == 3.
}
```

However, in `main` (or any other free-standing function, or any other class that isn’t `FooBar` or its `friend`), the following is invalid:

```cpp
int main() // or any free-standing function, or any method of a different class than FooBar:
{
    FooBar fooBar(1, 2); // valid

    fooBar.privateMethod(); // INVALID: COMPILE ERROR!
                            // "error: 'privateMethod' is a private member of 'FooBar'"
    std::cout << fooBar.mPrivateField << std::endl; // INVALID: COMPILE ERROR!
        // "error: 'mPrivateField' is a private member of 'FooBar'"
}
```

All methods of a class can access the private members of the same class, e.g., if `FooBar`’s `publicMethod` was implemented like so:

```cpp
void FooBar::publicMethod() {
    // The 'this->' is unnecessary in the following, but just to be explicit:
    this->mPrivateField += 5; // okay -- all methods of a class have access to its private members.
    this->privateMethod;      // okay -- all methods of a class have access to its private members.
}
```

In C++, <u>access specifiers apply at the class level</u>, not at the object level. For example, suppose we had a method in `FooBar` like so:

```cpp
class FooBar {
public:
    // ...
    void swap(FooBar& other) {
        std::swap(publicField, other.publicField);
        std::swap(mPrivateField, other.mPrivateField); // this is okay!
    }
    // ...
};
```

Even though `other.mPrivateField` is a private member, `this` is granted access to it as well because we belong to the same class. This would not be the case in general if `other` was of a different type than `FooBar`.

<span id="sec_1_3_3"></span>

#### Friendship

While the `private` access specifier abstracts away secrets from the outside world, sometimes you want to make exceptions for certain things. These things are `friend`s. In C++, a `class`/`struct` can declare another `class`/`struct` <u>or</u> function (including class methods, whether `static` or not!) a `friend`. A `class`/`struct` can have as many friends as you allow it to. When you do this, `friend` functions are are allowed to access the original class’s private members (fields and methods). Similarly, `friend` `class`/`struct`s are allowed, in their methods, to access the original class’s private members.

We can allow `FooBar` to befriend a class by placing the friendship statement anywhere in `FooBar`’s class body like so:

```cpp
class FooBarFriend; // forward declaration so we can befriend it in FooBar:

class FooBar {
    // ...
    friend FooBarFriend;
    // ...
};

class FooBarFriend {
public:
    void showSecrets(FooBar& fooBar) {
        fooBar.privateMethod();                         // okay -- FooBar grants us permission.
        std::cout << fooBar.mPrivateField << std::endl; // okay -- FooBar grants us permission.
    }
};
```

Similarly, `FooBar` can befriend a function like so:

```cpp
class FooBar; // forward declaration so showSecrets can use it in its signature:

void showSecrets(FooBar&); // forward declaration so we can befriend it in FooBar:

class FooBar {
    // ...
    friend void showSecrets(FooBar&);
    // ...
};

void showSecrets(FooBar& fooBar) {
    fooBar.privateMethod();                         // okay -- FooBar grants us permission.
    std::cout << fooBar.mPrivateField << std::endl; // okay -- FooBar grants us permission.
}
```

A very common case where this happens is when you want to define a custom print operation for your class. This is done by overloading the free-standing function `std::ostream& operator<<(std::ostream& os, const MyClass& obj)`. If you want `operator<<` to be able to access your private members, it must be declared `friend`:

```cpp
class FooBar; // forward declaration so operator<< can use it in its signature:

std::ostream& operator<<(std::ostream&, FooBar&); // forward declaration so we can befriend it in 
                                                  // FooBar:

class FooBar {
    // ...
    friend std::ostream& operator<<(std::ostream&, FooBar&);
    // ...
};

std::ostream& operator<<(std::ostream& os, FooBar& fooBar) {
    // Okay because FooBar declared us friend:
    return os << "FooBar { .publicField: " << fooBar.publicField
              << ", .mPrivateField: " << fooBar.mPrivateField << " }";
}

int main () {
    FooBar fooBar(1, 2);
    std::cout << fooBar << std::endl; // prints 'FooBar { .publicField: 1, .mPrivateField: 2 }'
}
```

We can also befriend another class’s method specifically:

```cpp
class FooBar; // forward declaration so showSecrets can use it in its signature:

class FooBarFriend {
public:
    void showSecrets(FooBar&); // forward declaration so we can befriend it in FooBar:
};

class FooBar {
    // ...
    friend void FooBarFriend::showSecrets(FooBar&);
    // ...
};

void FooBarFriend::showSecrets(FooBar& fooBar) {
    fooBar.privateMethod();                         // okay -- FooBar grants us permission.
    std::cout << fooBar.mPrivateField << std::endl; // okay -- FooBar grants us permission.
}

int main() 
{
    FooBar fooBar(1, 2); // valid
    FooBarFriend{}.showSecrets(fooBar); // valid -- FooBar grants this method permission.
}
```

In real life, friendships are a two-way street: If you’re my friend, I’m your friend. In C++, friendships are one-way by default<sup><a href="#footnote6" id="footnoteret6" class="footnoteret">[6]</a></sup>. For example, the following would fail to compile:

```cpp
class FooBarFriend; // forward declaration

class FooBar {
public:
    // ...
    friend FooBarFriend;
    void showFriendSecrets(const FooBarFriend& other);
    // ...
};

class FooBarFriend {
    // implicitly private since this is a class:
    int mPrivateField;
};

void FooBar::showFriendSecrets(const FooBarFriend& other) 
{
    // Fails because FooBarFriend did not declare FooBar as their friend
    std::cout << other.mPrivateField << std::endl; // COMPILE ERROR!
    // "error: 'mPrivateField' is a private member of 'FooBarFriend'"
}
```

Furthermore, friendships are non-transitive: just because you declare someone else a friend doesn’t mean that their friend is your friend:

```cpp
struct A;
struct B;
struct C;

struct A {
    friend B;
private:
    mPrivateField;
};

struct B {
    friend C;
};

struct C {}; // C cannot access A{}.mPrivateField!
```

And you don’t have to worry about the enemy of an enemy <span>&#58;&#41;</span>

<span id="sec_1_3_4"></span>

#### Getters/setters & validation

A common pattern is to hide member variables and to expose getters/setters, which can force validation checks. The following class always ensures it stores a positive value:

```cpp
class PositiveInteger {
public:
    PositiveInteger(unsigned int val) : mVal{val} { validate(val); }
    unsigned int getVal() const { return mVal; }
    void setVal(unsigned int val) {
        validate(val);
        mVal = val;
    }
    // conversion operator
    operator unsigned int() const { return getVal(); }
private:
    bool validate(unsigned int val) {
        if (val == 0) [[unlikely]] {
            // requires #include <stdexcept>
            throw std::invalid_argument("Non-positive integer received!");
        }
    }
    unsigned int mVal;
};
```

<span id="sec_1_4"></span>

### Inheritance

Inheritance is the facility by which our modules of data and methods get abstracted, specialized, and extended. If one considers abstraction to be the ability to make something <q>more general</q>, then the converse can be viewed as the ability to make things <q>more specific</q>. This section will explore how, by designing this converse from some basic and clear intuitions, we can design what it means to <q>extend</q> and <q>specialize</q> from an existing, *inherited* base type, and conversely how this immediately gives us the original operation: abstraction.

> **Note (terminology).** A lot of the following discussion will be about what it means for one type to be an *abstraction* of another type, or equivalently, what it means for the latter type to *specialize* the former. There are many wordings to describe this relationship, each subtly accentuating different aspects of the relationship. For the purposes of our discussion, the following are roughly equivalent:
>
> - Type $B$ is a *specialization of* type $A$.
> - Type $B$ *inherits* from type $A$.
> - Type $B$ is *derived from* type $A$.
> - Type $B$ is a *subtype*<sup><a href="#footnote7" id="footnoteret7" class="footnoteret">[7]</a></sup> *(subclass)* of type $A$
> - Type $B$ is a *child class* of type $A$ (if possibly separated by multiple levels, *descendant class*)
> - $B \leq: A$ or $B \sqsubseteq A$ (accentuating that the derived class admits a subset of the objects that the base class does).
>
> And equivalently, in the converse direction:
>
> - Type $A$ is a *generalization<sup><a href="#footnote8" id="footnoteret8" class="footnoteret">[8]</a></sup> of* type $B$.
> - Type $A$ is *inherited* by type $B$.
> - Type $A$ is a *base<sup><a href="#footnote9" id="footnoteret9" class="footnoteret">[9]</a></sup> class* for type $B$.
> - Type $A$ is a *supertype (superclass)* of type $B$
> - Type $A$ is a *parent class* of type $B$ (if possibly separated by multiple levels, *ancestor class*)
> - $A :\geq B$ or $A \sqsupseteq B$ (accentuating that the base class admits a superset of the objects that the derived class does).

<span id="sec_1_4_1"></span>

#### Abstraction and specialization of compound data types

In programming, the ability to make things more specific takes many forms. Since we’ve now defined class types to involve both *data* and *methods*, we’ll start with the easy case — what does it mean to make data more specific?

Recall the data members of our original shape `struct`s. Both stored `float`s for `posX` and `posY`, meaning that there is shared structure (and hence, room for abstraction) between the shape types — they are both <q>positionable</q>. Thus, we can imagine the following abstracted data type:

```cpp
struct Positionable {
    float posX;
    float posY;
};
```

In C++, to indicate that type $B$ *publicly inherits* (we will go over what `public` inheritance means in section [1.4.4](#sec_1_4_4)) from type $A$, we write `struct B: public A { /* B implementation here */};` (for now, ignoring access specifiers) and indeed, we could rewrite:

```cpp
struct Circle: public Positionable {
    float radius;
};

struct Rectangle: public Positionable {
    float width;
    float height;
};
```

and this does exactly what we want — `Circle` and `Rectangle` both *inherit* the `posX` and `posY` fields via a `Positionable` *subobject*. The memory layout of these structs is exactly the same as our original shape definitions, and you can still access the inherited fields like `circle.posX`.

> **Aside (Name hiding/shadowing).** It is possible for a descendant class to have a member of the same name as one of its ancestor classes (but in general this is a code smell). In this case, the most-derived version that still encloses our scope is accessed by default, and you can access a specific version like so:
>
> ``` cpp
> struct Base {
>     int x;
> };
>
> struct Derived: public Base {
>     int x; 
>
>     void print() const {
>         std::cout << this->x << std::endl; // prints Derived's x
>         std::cout << Base::x << std::endl; // prints Base's x.
>     }
> };
> ```

Another intuitive way to understand this is that `Circle`s are <q>more specific</q> than `Positionable`s, because the former has strictly more data than the latter.

Hence, the simplest form of abstraction on collections of data (`struct`s and `class`es) is the act of *removing entries*<sup><a href="#footnote10" id="footnoteret10" class="footnoteret">[10]</a><a href="#footnote11" id="footnoteret11" class="footnoteret">[11]</a></sup>. Furthermore, the converse operation of specializing collections of data means *inheriting* the pre-existing data fields and being able to append more fields. This is (almost<sup><a href="#footnote12" id="footnoteret12" class="footnoteret">[12]</a></sup>) exactly what happens in general when a C++ `struct` or `class` inherits from another one.

<span id="sec_1_4_2"></span>

#### Abstraction and specialization of method collections

The question of what it means to make the methods of a type <q>more general</q> or <q>more specific</q> is a bit more complicated. To answer this, we will look at two dimensions of specificity:

- *Interface inheritance*: (publicly) derived classes have an interface which extends the base class’s interface, and
- *Implementation inheritance*: derived classes receive and can further specialize the base class’s method implementations.

<span id="sec_1_4_2_1"></span>

##### Interface inheritance (subtyping)

**TL;DR of [1.4.2.1](#sec_1_4_2_1)**: When $B$ <u>publicly</u><sup><a href="#footnote13" id="footnoteret13" class="footnoteret">[13]</a></sup> inherits from a class $A$, $B$ also receives its public interface, which it can <q>extend</q> by adding its own methods. This is one way of making a collection of methods <q>more specific</q>.

Recall that encapsulation allows us to model all objects as collections of methods, with their implementation details (including data members) abstracted away. From this perspective, OOP is about sending and receiving signals (method calls) between objects which can be understood just by their public interfaces.

Viewing a type as the collection of *all objects* which implement the methods in the type’s contract, what does it mean to make this space bigger (more general) or smaller (more specific)? Satisfying a contract means implementing `method1` *and* `method2` *and* so on. Since this is a conjunction (logical and) of requirements, adding more requirements (i.e., methods) can only make the interface more specialized, and removing methods can only make the interface more general.

Hence, if we want $B$ to be a more specific version of a base type $A$, it can can only make sense for $B$ to receive $A$’s public interface, so that $B$ can extend it by adding more methods. This ensures that the set of all objects satisfying $B$’s interface is a subset of the set of all objects which satisfy $A$’s interface.

In C++, interface inheritance **always** happens when you *publicly inherit* from another class. In particular, if $B$ publicly inherits from $A$, it not only receives its `public` (and `protected`) fields, but also its entire<sup><a href="#footnote14" id="footnoteret14" class="footnoteret">[14]</a></sup> `public` interface. For example, consider the following code

```cpp
class Circle {
public:
    float area() const;
private:
    void privateMethod();
};

class ColourCircle: public Circle {
public:
    // float area() const; is inherited from Circle
    // void privateMethod() is NOT inherited!
    Colour colour() const;
};
```

Then in any function, if you have a variable `ColourCircle colourCircle;`,

```cpp
colourCircle.colour(); // valid as you'd expect
colourCircle.area(); // valid! ColourCircle inherits area() from Circle's public interface
colourCircle.privateMethod(); // ERROR!
```

The notion of subtyping captures the idea of *substitutability*: if you have a place in your code which relies on some object satisfying the interface of some abstracted class $A$, then you should be able to replace $A$ with any derived class $B$ and the code should still work. For example, anywhere you expect a `Circle` (and only use the methods available to general `Circle`s), a `ColourCircle` ought to implement *at least* the same methods (or else it’s not a `Shape`). Hence, you should be able to *substitute* the `ColourCircle` in for a `Circle`.

Suppose I had a function taking a general `Circle` like so:

```cpp
void printArea(const Circle& shape) {
    std::cout << shape.area() << std::endl;
}
```

Then this is immediately valid code:

```cpp
printArea(colourCircle); // valid: all references to derived types are implicitly convertible to
                         //        references to their ancestor types.
```

<span id="sec_1_4_2_2"></span>

##### Implementation inheritance (code reuse)

**TL;DR of [1.4.2.2](#sec_1_4_2_2)**: When $B$ inherits<sup><a href="#footnote15" id="footnoteret15" class="footnoteret">[15]</a></sup> from a class $A$, $B$ also receives the *implementation* of all of $A$’s methods, which it can specialize by *overriding* the given method implementations with its own implementation (specific to $B$). This is the other way we make collections of methods <q>more specific</q>.

While one way of making a contract more specific is to add more clauses (i.e., more methods to implement), another way is to make the implementations of the methods even more specialized. The most general a method can be is to... not provide an implementation at all, but rather just the function signature that needs to be implemented (this is part of what is strictly called an interface ([1.5.4.2](#sec_1_5_4_2))). For example, just saying `void sort();` is a method in our class doesn’t impose any restrictions on *how* the sorting should be done. One can then imagine that a <q>more specific</q> version of the class might have its own ideas about how to sort.

From another perspective, we know from [1.4.1](#sec_1_4_1) that subclasses receive all of the data fields of their superclasses, and can extend these fields by adding more. Then, as we get more and more specific subclasses, we might want to rewrite methods to *take advantage of this extra data*.

Thus, if we want $B$ to be a more specific version of base type $A$, it can only make sense for $B$ to receive *the implementations of* $A$'s methods, so that it can specialize them by *overriding* these implementations with new implementations.

The fact that derived classes receive the implementation of almost all<sup><a href="#footnote16" id="footnoteret16" class="footnoteret">[16]</a></sup> of their base classes methods (and all of their base classes' non-static data members) is called implementation inheritance.

> **Overriding methods.** In C++, name lookup rules dictate that when we reference a (variable/method/type) name in some scope, the matching name in the deepest-nested enclosing scope is chosen. In class definitions, this means that any method names which exist in your derived class are chosen over any methods which have the same name in base classes. This is another form of *name hiding* or *shadowing* (like in the aside of [1.4.1](#sec_1_4_1)). For example,
>
> ``` cpp
> class Base {
> public:
>     void foo() const {
>         std::cout << "Hello, Base!\n";
>     }
> };
>
> class DerivedA: public Base {
> // Inherits Base's implementation of foo().
> };
>
> class DerivedB: public Base {
> public:
>     // DerivedB::foo() *hides* Base::foo()
>     void foo() const {
>         std::cout << "Hello, Derived!\n";
>     }
> };
>
> int main() {
>     DerivedA{}.foo(); // prints "Hello, Base!"
>     DerivedB{}.foo(); // prints "Hello, Derived!" (because DerivedB::foo hides Base::foo)
> }
> ```
>
> <a href="https://godbolt.org/z/cMhEMbhdh" target="_blank" rel="noopener noreferrer">Run it yourself!</a>
>
> Because name lookup only looks at... names, it ignores method signatures. This means that you could instead have a different signature like `float Derived::foo(int, void*)`, and this would *still* hide `void Base::foo() const`(!)<sup><a href="#footnote17" id="footnoteret17" class="footnoteret">[17]</a></sup>
>
> In [1.4.2.1](#sec_1_4_2_1), we saw that derived references (also pointers) are implicitly convertible to their base references (respectively, base pointer). If we try to take advantage of name hiding to re-implement our methods, what happens when we access methods via a pointer/reference to a base class?
>
> ``` cpp
> int main() {
>     DerivedB derived{};
>     Base& baseRef = derived; // implicit conversion to base reference is okay!
>     baseRef.foo(); // prints "Hello, Base!" (!!)
> }
> ```
>
> <a href="https://godbolt.org/z/9W5xG68YM" target="_blank" rel="noopener noreferrer">Run it yourself!</a>
>
> Name hiding here doesn’t apply because at compile time, all we see is that we want to call the `foo` method of a `Base`. Name lookup will look at `Base`’s scope, and only find `Base::foo`, and hence print `Hello, Base!`.
>
> To force a pointer or reference *to a Base class* to find the most-derived relevant implementation, we must add the `virtual` keyword to the base declaration of the method, and optionally (ideally) add the `override` keyword to any overriding implementations in derived classes<sup><a href="#footnote18" id="footnoteret18" class="footnoteret">[18]</a></sup>. This looks like:
>
> ``` cpp
> class Base {
> public:
>     virtual void foo() const {
>         std::cout << "Hello, Foo!\n";
>     }
> };
>
> class Derived: public Base {
> public:
>     void foo() const override {
>         // If this implementation wasn't here, we'd inherit Base's implementation of foo().
>         std::cout << "Hello, Derived!\n";
>     }
> };
>
> int main() {
>     Derived derived{};
>     Base& baseRef = derived; // implicit conversion to base reference is okay!
>     baseRef.foo(); // prints "Hello, Derived!" (!!) via virtual method table lookup,
>                    //   NOT "Hello, Foo!"
>
>     // Same for pointers:
>     Base* basePtr = &derived; // implicit conversion to base pointer is okay!
>     basePtr->foo(); // again, prints "Hello, Derived!" (!!) via virtual method table lookup
> }
> ```
>
> <a href="https://godbolt.org/z/6hfcrc5ac" target="_blank" rel="noopener noreferrer">Run it yourself!</a>
>
> We explore in detail why `virtual` works in the Polymorphism section ([1.5](#sec_1_5)).

<span id="sec_1_4_3"></span>

#### Protected access

Recall that `private` access means that a member of a class-type `Base` is only accessible within the same class-type and by friends. This introduces a challenge for us, because any class `Derived` which derives from `Base` is neither `Base` itself, nor (by default) a `friend` of `Base`. From our discussion in section [1.4.1](#sec_1_4_1), however, we know that `Derived` inherits all of the fields of `Base`, and furthermore they are accessible via `Base`’s scope: `Base::memberName`.

Hence by definition, an inherited `private` field is inaccessible to the derived class!

What’s the alternative? A `public` member of `Base` which is inherited by `Derived` *is* directly accessible by `Derived`, but it is also accessible to everybody else. We want a way to inherit members and have them be accessible to derived classes, but to still *protect* them from the outside world (things other than ourselves and friends).

This is exactly what the `protected` access specifier does. A `protected` field is accessible within the same `class`/`struct`, to `friend`s, <u>and to derived types</u>:

```cpp
class Base {
public:
    void printField() const {
        std::cout << mField << std::endl; // okay, as always.
    }
protected:
    int mField;
};

class Derived: public Base {
public:
    void derivedPrintField() const {
        std::cout << mField << std::endl; // okay! Publicly inheriting from Base means mField is
                                          //  protected in Derived.
    }
};

int outsidePrintField(const Base& base) {
    std::cout << base.mField << std::endl; // ERROR! Protected fields are protected from outsiders.
                                           // "error: 'int Base::mField' is protected within this context"
}
```

<span id="sec_1_4_4"></span>

#### Inheritance access specifiers

We finally discuss what it means to <q>publicly inherit</q>, <q>privately inherit</q> and to <q>protectedly inherit</q> from a base class.

Just like we can define the accessibility of members using `public`, `protected`, and `private`, we can also define the accessibility of base classes like so:

```cpp
class Base;

class Derived: /* access specifier */ Base {
    // ...
};
```

Inheritance access specifiers are effectively masks on the member access specifiers of a base class. Together, inheritance and member access specifiers determine the new access level of inherited members in the derived class.

The rule to determine the access level of inherited members is: <q>if the original member had private accessibility, it is inaccessible in derived classes, otherwise it is the most private between the original member access specifier and the inheritance access specifier.</q> where most private to least private is: `private`, `protected`, `public`.

The following table gives the accessibility of inherited base class members depending on their member access specifier in the base class, together with the inheritance access specifier, according to the above rule:


<table style="margin-left: auto; margin-right:auto; margin-top:0.15in;">
            <tbody><tr>
                <th class="noborder" colspan="2"></th>
                <th colspan="3">(Base) member access specifier<br><code>class Base { /* this one */: int member;</code> }</th>
            </tr>
            <tr>
                <td class="noborder" colspan="2"></td>
                <th><code>public</code></th>
                <th><code>protected</code></th>
                <th><code>private</code></th>
            </tr>
            <tr>
                <th rowspan="5" style="">Inheritance access specifier<br><code>class Derived: /* this one */ Base</code></th>
                <th><code>public</code></th>
                <td><code>public</code></td>
                <td><code>protected</code></td>
                <td><i>not directly accessible</i></td>
            </tr>
             <tr>
                <th><code>protected</code></th>
                <td><code>protected</code></td>
                <td><code>protected</code></td>
                <td><i>not directly accessible</i></td>
            </tr>
             <tr>
                <th><code>private</code></th>
                <td><code>private</code></td>
                <td><code>private</code></td>
                <td><i>not directly accessible</i></td>
            </tr>
        </tbody></table>


Or, if you prefer code:

```cpp
class Base {
public:
    int a;
protected:
    int b;
private:
    inc c;
};

// PublicDerived "publicly inherits" from Base
class PublicDerived: public Base {
    // a is public
    // b is protected
    // c NOT (directly) ACCESSIBLE
};

// ProtectedDerived "protectedly inherits" from Base
class ProtectedDerived: protected Base {
    // a is protected
    // b is protected
    // c NOT (directly) ACCESSIBLE
};

// PrivateDerived "privately inherits" from Base
class PrivateDerived: private Base {
    // a is private
    // b is private
    // c NOT (directly) ACCESSIBLE
};
```

Note that even though in each case above the `private` member of `Base`, `c`, is not directly accessible, it **still occupies memory in the derived classes**. Furthermore, it can be indirectly accessed via the inherited non-`private` methods from `Base`.

<span id="sec_1_4_4_1"></span>

##### Default inheritance access specifiers

Following the same pattern as the default member access specifiers, by default a derived `class` inherits `private`ly from its base (whether the base is a `class` or `struct`):

```cpp
struct Base;

// Defaults to private inheritance since Derived is a class.
class Derived: Base { /* ... */ };
```

And by default, a derived `struct` derives `public`ly from its base:

```cpp
class Base;

// Defaults to public inheritance since Derived is a struct.
struct Derived: Base { /* ... */ };
```

In fact, the \underline{only difference} between `class`es and `struct`s is their default member access specifiers, and their default inheritance access specifiers.

> **Note (convention).** Even though `class`es and `struct`s are interchangeable if you override their default access specifiers, they commonly signal specific semantic meanings from a style perspective.
>
> You should reserve `struct`s for **Plain Old Data (POD)** types. Roughly speaking, a POD type is just a C-style struct which is just meant to aggregate a bunch of types together like
>
> ``` cpp
> struct ColouredCircle {
>     Circle circle;
>     Colour colour; // this can just be 4 floats representing RGBA
> };
> ```
>
> where you don’t have any fancy behaviours, `virtual` methods, or custom constructors/destructors/assignment operators.
>
> The intention of a POD type is that you can just do a bitwise copy of it, without any fancy move/copy semantics<sup><a href="#footnote19" id="footnoteret19" class="footnoteret">[19]</a></sup>, and that it has a memory layout that can be communicated to other languages<sup><a href="#footnote20" id="footnoteret20" class="footnoteret">[20]</a></sup>. For this reason, with POD types you generally just directly modify the fields. A more thorough treatment of POD types is given in appendix [B](#sec_2_2).
>
> On the other hand, by convention `class`es are reserved for types where you intend to take advantage of OOP features like different access specifiers, inheritance, and polymorphism. For example,
>
> ``` cpp
> class CustomerInterface {
> public:
>     // Not a POD: has virtual methods
>     virtual std::string name() const = 0;
>     virtual void charge(int cents) = 0;
>     virtual ~CustomerInterface() = default;
> };
>
> // Not a POD: inherits from a non-POD type
> class Customer: public CustomerInterface {
> public:
>     Customer(const std::string& name, int64_t balanceCents) : 
>         mName{name}, mBalanceCents{balanceCents} 
>     {
>     }
>
>     // Not a POD: overrides (hence has) virtual methods.
>     std::string name() const override { return mName; }
>
>     void charge(int cents) override {
>         mBalanceCents -= cents;
>     }
>
> // Not a POD: has different access specifiers.
> private:
>     std::string mName;
>     int64_t mBalanceCents;
> };
> ```

<span id="sec_1_4_5"></span>

#### What isn’t inherited?

> **Important.** When a derived type inherits from a base type, the derived object inherits — embedded directly in its memory layout — a *base subobject*<sup><a href="#footnote21" id="footnoteret21" class="footnoteret">[21]</a></sup>. Through this base subobject, it inherits <u>all</u><sup><a href="#footnote22" id="footnoteret22" class="footnoteret">[22]</a></sup> non-`static` base members *except for*:
>
> - constructors,
> - the destructor, and
> - assignment operators.
>
> **Of the inherited non-static members, it only has *direct access to* those which are `public` or `protected` in the base class.**
>
> At the class level, the derived class does not inherit friends, and it does not receive a <q>copy</q> of the base `static` members, but it does *gain access* to `static` base members which are either `public` or `protected`.

Why aren’t constructors, destructors, or assignment operators (the special member functions) inherited? One basic reason is that usually, derived types have more fields than their base classes. If you were able to call the base constructor on a derived object, those additional fields would be uninitialized. Similarly, copy and move assignment operators would fail to copy/move the additional fields. And conversely, the base destructor would fail to cleanup those fields.

Wait! But we’ve been deriving from classes this whole time and often without writing our own special member functions! What’s going on here? The TL;DR is two things:

1.  C++ treats construction and destruction as special: each have a special sequence which automatically recursively calls the constructors/destructors (respectively) of bases when you construct/destruct a derived object.
2.  Under <q>sane</q> circumstances, C++ automatically (*implicitly*) creates, for each of the special member functions, a compiler-generated definition/implementation for you for free.

What do these implicitly-defined special member functions do? Roughly, they all *have the effect of* recursively calling the same special member function recursively on the object’s base subobjects and non-static data members in an order that makes sense. The main cause of a special member function *not* being generated for you, if you didn’t write a manual implementation, is that one of your base subobjects or non-static data members doesn’t have the corresponding special member function implemented.

The next few sections ([1.4.7](#sec_1_4_7)-[1.4.9](#sec_1_4_9)) cover, in detail, how special member functions are treated in relation to inheritance in C++. In particular, how are initialization and destruction handled specially? When are special member functions *implicitly-declared* and *implicitly-defined*? What if I want my own manual implementations?

The coverage on the implicitly-defined special member functions can seem dense on your first reading. If you feel this is the case, I have provided a summary rule-of-thumb and a helpful table in [1.4.10](#sec_1_4_10). Furthermore, here are some principles/intuitions that explain nearly all the rules we cover below. I highly recommend understanding these points first, which will make the following sections much easier to understand.

<span id="sec_1_4_6"></span>

#### Principles/intuitions for compiler-generated special methods

> **Important.** When should a special method be given to you by the compiler? When it is both *possible* and *sane* for it to do so. When is that? Consider the following points:
>
> - **To generate an implementation of a special method for you, the same special method must exist (and be accessible) for all base subobjects and data members:** otherwise, how is the compiler supposed to know how to e.g., copy-construct a type when it doesn’t know how to do the same for all of its fields and base subobjects? This principle applies in principle to all of the special methods (default constructor, copy/move constructors, copy/move assignment operators, destructor), with a slight relaxation for the move constructor/assignment operator:
>   - ***Exception* — If special move semantics are missing for a subobject/field, copy semantics are an acceptable substitute:** compiler-generated special methods need to call the same special method on their base subobjects and data members, *except for the move assignment/constructor*. For these two special methods, if they contain fields/subobjects which don’t have special move semantics, their copy assignment/constructor (respectively) will suffice instead. Remember that move semantics are essentially just an optimization, an efficiency gain we obtain if we’re allowed to <q>steal</q> resources from another object. Otherwise, we’re okay with just copying.
>
> - **If you write your own version of the special method, the compiler will not generate it for you:** otherwise, why did you write your own?
>
> - **It is not sane to assign to `const` members and members which are reference-types:** by definition, if you already have an existing object with a `const` data member, it is impossible to assign a new value to it. Similarly, references cannot be rebound once they are initialized. So it doesn’t make sense for the compiler to generate a copy, nor a move assignment operator in either case. Having `const` or reference-type members will prevent compiler generation of all assignment operators.
>
> - ***(The rule of three)* If you manually define any of the copy constructor, copy assignment operator, or destructor, you almost certainly ought to manually define all three:** if you need custom logic to copy-construct your class, why wouldn’t you need custom logic to copy-assign your class (and vice-versa)? If you needed to write a custom copy constructor/assignment operator, it is likely that you wrote custom logic to allocate/manage resources (e.g., heap memory). In this case, you need to write a custom destructor to free the resources (and vice-versa).
>
>   In C++, if you wrote a custom one of any one of these three, the other two are *still implicitly-defined for you*. But this was a language design mistake. Now, the implicit generation of the other two is *deprecated*, meaning that you’ll get a compiler warning, and that the <q>feature</q> could be removed in future versions of C++. Do not rely on this deprecated behaviour.
>
> - ***(The rule of five)*: If you want special move semantics for a class, you almost certainly need to write all of the copy/move-constructors, copy/move-assignment operators, and the destructor.** Having special move semantics implies ownership of a special resource that can be <q>stolen</q> (e.g., heap-allocated memory). If you have resource ownership, copy semantics cannot just shallow copy pointers, so a custom copy constructor/assignment operator is needed. Furthermore, if you own resources, a custom destructor is necessary.
>
>   Unlike for the rule of three, the language is designed correctly for this rule. Consider the following list of 5 special methods:
>
>   - copy constructor
>   - copy assignment operator
>   - destructor
>   - move constructor
>   - move assignment operator
>
>   If you *declare* (not even define) any of those 5 special methods, neither the move constructor, nor the move assignment operator are even implicitly-declared for you.
>
> If you understand and agree with these principles, the rules described in sections [1.4.7](#sec_1_4_7)-[1.4.9](#sec_1_4_9) will immediately follow.

<span id="sec_1_4_7"></span>

#### Construction of objects of derived type

Because inheritance in C++ means that base subobjects are embedded (memory-layout-wise) in the instances of the derived class, construction/destruction of objects has to account for the constructors/destructors of their base subobjects. Suppose you perform *multiple inheritance*<sup><a href="#footnote23" id="footnoteret23" class="footnoteret">[23]</a></sup> like so:

```cpp
class A {
public:
    int x;
};

class B {
public:
    float y;
    int z;
};

class C: public A, public B { 
public:
    float a;
};
```

Then *one possible memory layout*<sup><a href="#footnote24" id="footnoteret24" class="footnoteret">[24]</a></sup> of `C` is:

```text
| int x | float y | int z | float a |
|---A---|--------B--------|
|-----------------C-----------------|
```

emphasizing that `C` has as embedded subobjects `A` and `B`. How should we initialize an object of type `C`?

For now, there are three things that need to happen when you initialize an object:

1.  the body of the constructor, which can execute arbitrary code upon creation of the object,
2.  the initialization of non-static data members of the class, and
3.  the initialization of base subobjects.

The main question is: in what order should these three things happen in?

**Answer:** There is one basic principle that determines whether one of these parts should come before another:

*If* $y$ <u>depends on</u> $x$, $y$ needs to be initialized after $x$ has been initialized. Conversely, the less dependencies $x$ has, the earlier it should happen in the initialization.

You may have heard this principle before by a different name: *Topological sorting*.

Recall from [1.2](#sec_1_2) that one key design point we wish to achieve with OOP is that we want more general types (abstractions/base classes) to be completely independent of their derived types. Then, it cannot possibly make sense for the initialization of the base subobjects to depend on either the constructor, nor the initialization of the non-static data members of the derived type. Hence, initialization of base subobjects should come first.

It remains to figure out whether the constructor body or the initialization of the non-static data members should come first. The whole point of directly initializing data members is to avoid the inefficiency of <q>initializing the data members to a default value and then overwriting that default value</q>. That is to say that the act of initializing data members does not depend on the constructor body, and the constructor body depends on the initialized members to do anything with them. Hence, non-static data member initialization is second, and the constructor body comes last.

> **Initialization order (simplified).** When a class with no virtual bases is instantiated, its fields and bases are initialized in the following order:
>
> 1.  First, all direct bases are initialized in left-to-right order as they appear in the list of bases.<sup><a href="#footnote25" id="footnoteret25" class="footnoteret">[25]</a></sup>
> 2.  Then, non-static data members are initialized in the order (top-to-bottom) they appear in the class definition.
> 3.  Finally, the body of the constructor is executed.

For our above example, that looks like:

- Initialization of `C` begins.
  - Initialization of `A` (subobject) begins.
    - `A` has no direct bases.
    - **`int x` is initialized.**
    - `A`’s constructor is called.
  - Initialization of `B` (subobject) begins.
    - `B` has no direct bases.
    - **`float y` is initialized.**
    - **`int z` is initialized.**
    - `B`’s constructor is called.
  - **`float a` is initialized.**
  - `C`’s constructor is called.

<span id="sec_1_4_7_1"></span>

##### Implicitly-defined constructors

Derived types do not inherit their constructors, but they achieve a similar effect because of this initialization order, together with the *implicitly-defined* constructors.

<span id="sec_1_4_7_1_1"></span>

###### Default constructor

The default constructor for a class-type `T` is the constructor which takes no arguments, `T()`.

*Implicit-declaration:* When you do not declare <u>any</u><sup><a href="#footnote26" id="footnoteret26" class="footnoteret">[26]</a></sup> constructor (like `Derived()`, `Derived(const Derived&)`, etc.), a default constructor is *implicitly-<u>declared</u>* for you.

*Implicit-definition:* If all of `Derived`’s non-static member fields and base classes are default-constructible<sup><a href="#footnote27" id="footnoteret27" class="footnoteret">[27]</a></sup>, a default constructor is *implicitly-<u>defined</u>* for you which is equivalent to an empty constructor like `T(){}`. Due to the initialization sequence described earlier ([1.4.7](#sec_1_4_7)), this constructor calls the constructors for respective bases and data members in initialization order. This gives the *impression* of inheriting the base default constructor, while also initializing new fields in the derived class.

> **Note (default-constructible):** A type is default-constructible if it can be constructed without any arguments. For example:
>
> - In general, if a class type `T` has a public default constructor `T()` defined (whether by you or implicitly by the compiler), it is default-constructible.
> - Non-`const` non-class object types, in particular, all primitives besides `void` (e.g., `int`, `void*`) are always default-constructible.
> - `const` non-class types (e.g., `const int`) are not default-constructible.
> - Non-object types (e.g., functions, references, `void`) are not default-constructible.

<span id="sec_1_4_7_1_2"></span>

###### Copy constructor

A copy constructor for a class-type `T` is a constructor which, as its argument, takes a `const T&` (`const`-lvalue reference to `T`)<sup><a href="#footnote28" id="footnoteret28" class="footnoteret">[28]</a></sup> like

`T(const T& other)`.

*Implicit-declaration:* If `T` has no user-defined copy constructors, the compiler will implicitly-declare a copy constructor for `T`.

*Implicit-definition:* The implicitly-declared copy constructor is defined as deleted (i.e., not generated for you) if:

- any base subobjects or non-static data members of `T` cannot themselves be copy-constructed,
- any base subobjects or non-static data members of `T` cannot be destructed by us,
- you provide a move constructor,
- you provide a move assignment operator,
- `T` has any rvalue reference fields.

Otherwise, the implicitly-defined copy constructor for a type `T` copy-constructs its base subobjects and non-static member fields in initialization order ([1.4.7](#sec_1_4_7)<sup><a href="#footnote29" id="footnoteret29" class="footnoteret">[29]</a></sup>).

*Note (deprecation):* the implicitly-defined copy constructor is deprecated if you have either/or a user-defined destructor, or user-defined copy assignment operator, since relying on the implicitly-defined copy constructor would be a violation of the *rule of three* in this case.

<span id="sec_1_4_7_1_3"></span>

###### Move constructor

A move constructor for a class-type `T` is a constructor which, as its argument, takes a `T&&` (rvalue reference to `T`), like

\
`T(T&& other)`

*Implicit-declaration:* If you don’t manually define a move constructor, the compiler will implicitly-declare a move constructor `T(T&&)` for a class-type `T` if **none** of the following are declared by you:

- copy constructor
- copy assignment operator
- move assignment operator
- destructor

*Implicit-definition:* The implicitly-declared move constructor is defined as deleted if:

- `T` has any non-static data members or bases which themselves cannot be move-constructed. Note that in particular, if a copy constructor exists but no move constructor exists for some of these members/bases, overload resolution will <u>still accept the copy constructor as a substitute for this condition</u>. Additionally, the move constructor is still deleted if:
- `T` has any non-static data members or bases which cannot be destructed by us.

Otherwise, the implicitly-defined move constructor for `T` move-constructs its base subobjects and non-static member fields in initialization order ([1.4.7](#sec_1_4_7)<sup><a href="#footnote30" id="footnoteret30" class="footnoteret">[30]</a></sup>).

<span id="sec_1_4_7_2"></span>

##### Member initializer lists

Supposing you do manually declare your own constructor, the implicitly-declared default constructor described in [1.4.7.1.1](#sec_1_4_7_1_1) is defined as deleted. In this case, the constructors that you manually implement can directly initialize the values of both the base subobjects, and the non-static members with a *member initializer list*.

Suppose you have a `class`/`struct` type `T` that has non-static data members `x`, `y` (for now type unimportant). A constructor with a member initializer list for `T` looks like:

`T(/* args */): x(/* x constructor args */), y(/* y constructor args */) { /* constructor body */ }`

or clang-formatted:

```cpp
T(/* args */)
    : x(/* x constructor args */)
    , y(/* y constructor args */)
{
    /* constructor body */
}
```

It’s just a list of initializers for non-static data members before the constructor body. In particular, you can also write `x{ /* x constructor args */ }` to invoke direct-list initialization (<q>uniform initialization</q>) on `x`. TODO: box and appendix about initialization.

Any omitted non-static data members will be default-initialized. If any non-static data members are not default-initializable (e.g., `const` primitives, references, and classes without a default constructor), you <u>must</u> explicitly initialize them in your member-initializer lists.

If you’re writing a constructor for a derived class, you may want to initialize a base subobject with a specific base constructor call. You can do that like so:

```cpp
class Base {
public:
    Base()
        : x { 0 }
    {
    }

private:
    int x;
};

class Derived : public Base {
public:
    Derived()
        : Base(/* args would go here if any */) // <-- just directly call the base 
                                                //     subobject constructor!
        , y { 1.f }
    {
    }

private:
    float y;
};
```

As before, any omitted bases in the member initializer list are default-initialized. If any base is not default-initializable, you <u>must</u> provide the base constructor call in the derived class’s member initializer list.

The order that you place non-static data members in the member initializer list <u>does not affect the order that the members are actually initialized in</u>. As described in the simplified initialization order above ([1.4.7](#sec_1_4_7)), non-static data members are <u>always</u> initialized in the order they are declared in the class definition. In terms of style, it is best practice to write the list in the order of initialization (i.e., the order the members are declared in the class definition).

> **Test your understanding.** What would this program output?
>
> ``` cpp
> #include <iostream>
>
> class Base {
> public:
>     Base() : x{0} {
>         ++x;
>         std::cout << "base " << x << std::endl;
>     }
> protected:
>     int x; // style-wise, should prefix with m, but for simplicity...
> };
>
> class Derived1: public Base {
> public:
>     Derived1() {
>         ++x;
>         std::cout << "derived1 " << x << std::endl;
>     }
> };
>
> class Derived2: public Derived1 {
> public:
>     Derived2() {
>         ++x;
>         std::cout << "derived2 " << x << std::endl;
>     }
>
>     void print() {
>         std::cout << x << std::endl;
>     }
> };
>
> int main() {
>     Derived2{}.print();
> }
> ```
>
> Solution: <sup><a href="#footnote31" id="footnoteret31" class="footnoteret">[31]</a></sup>

<span id="sec_1_4_7_3"></span>

##### Default member initializers

You can specific default values of non-static data members when they are not specified in a constructor’s member initializer list:

```cpp
struct POD {
    int foo;            // default initialization does nothing; indeterminate value
    float baz {};       // value-initializes to 0.f
    double bar { 2. };  // default value
};

// POD pod{}; would havve pod.foo uninitialized, pod.baz as 0.f, pod.bar as 2.
```

Member initializer lists of constructors always takes priority over default member initializers. Otherwise if neither exist, default-initialization occurs (which may give the member an indeterminate value). In the last case, it is undefined behaviour to read the value.

<span id="sec_1_4_8"></span>

#### Assignment of derived types

Similarly to the constructor, the copy & move assignment operators are not inherited, but by default C++ gives you a similar mechanism <q>for free</q>.

<span id="sec_1_4_8_1"></span>

##### Implicitly-defined assignment operators

These follow similar patterns to the corresponding implicitly-defined constructors. However, there are some common differences. One major difference is that while both `const` data members and reference data members are acceptable for the implicitly-defined copy and move *constructors*, the corresponding implicitly-defined copy/move *assignment operators* will be deleted in the same situations. Another difference is that since we’re not *constructing* any objects, there are no clauses about being able to access subobject destructors.

<span id="sec_1_4_8_1_1"></span>

###### Copy assignment operator

A copy-assignment operator for a class-type `T` is an assignment operator which looks like

`T& operator=(const T& other)`.

*Implicit-declaration:* If you don’t manually define a copy assignment operator, the compiler implicitly-declares one for you. In particular if each direct<sup><a href="#footnote32" id="footnoteret32" class="footnoteret">[32]</a></sup> base and each non-static data member have copy assignment operators which take `const` lvalue references, we get one which looks like `T& operator=(const T&)`.

*Implicit-definition:* The implicitly-declared copy assignment operator is defined as deleted if:

- `T` has any non-static data members or bases which themselves cannot be copy-assigned, or
- `T` has a non-static data member that is either `const` or a reference, or
- you declare a move constructor or a move assignment operator.

If you otherwise have an implicitly-defined copy assignment operator, it is defined to call the copy assignment operators of all bases and non-static data members *in initialization order* (as given in [1.4.7](#sec_1_4_7)<sup><a href="#footnote33" id="footnoteret33" class="footnoteret">[33]</a></sup>). This is precisely what gives the *illusion* of inheriting the copy assignment operator of bases while extending to new fields in derived classes. So, for example the following would work:

```cpp
class Base {
public:
    Base(): x{0} {}
protected:
    int x; // again, style-wise, should prefix with m.
};

class Derived: public Base {
private:
    int mDerivedField;
};

int main() {
    Derived a{}; // zero initialization on class type calls default constructor Derived()
               //   NOTE: if {} was excluded, this leaves mDerivedField indeterminate!
    Derived b;
    a = b; // Valid! Derived's implicitly-defined copy assignment is called, which calls
           // Base's implicitly-defined copy assignemnt, and then copies int mDerivedField.
}
```

*Note (deprecation):* the implicitly-defined copy assignment operator is deprecated if you have either/or a user-defined destructor, or user-defined copy constructor, since relying on the implicitly-defined copy assignment operator would be a violation of the *rule of three* in this case.

<span id="sec_1_4_8_1_2"></span>

###### Move assignment operator

A copy-assignment operator for a class-type `T` is an assignment operator which looks like

`T& operator=(T&& other)`.

*Implicit-declaration:* If you don’t manually define a move assignment operator, the compiler will implicitly-declare a move assignment operator `T& operator=(T&&)` for a class type `T` if `none` of the following are declared by you:

- copy constructor
- move constructor
- copy assignment operator
- destructor

*Implicit-definition:* The implicitly-declared move assignment operator is defined as deleted if:

- `T` has any non-static data members or bases which cannot themselves be move-assigned. Note that in particular, if a copy assignment operator exists but no move assignment operator exists for some of these members/bases, overload resolution will <u>still accept the copy assignment operator as a substitute for this condition</u>. Additionally, the move copy assignment operator is still deleted if:
- `T` has any non-static data members that are either `const` or a reference.

If you otherwise have an implicitly-defined copy assignment operator, it is defined to call the move assignment operators of all bases and non-static data members *in initialization order* (as given in [1.4.7](#sec_1_4_7)<sup><a href="#footnote34" id="footnoteret34" class="footnoteret">[34]</a></sup>). Again, if some of these bases/members only have copy assignment operators, `T`’s move assignment operator can still be implicitly-defined, and will call those copy assignments instead.

<span id="sec_1_4_8_2"></span>

##### Manually calling a base assignment operator

Otherwise you can manually define you own copy assignment operator which directly calls the assignment operators of your bases and members like so:

```cpp
class Derived: public Base {
public:
    Derived& operator=(const Derived& other) {
        Base::operator=(other); // <-- !!! How to call base class copy assignment
        mDerivedField = other.mDerivedField;
        return *this;
    }

    Derived& operator=(Derived&& other) {
        Base::operator=(std::move(other)); // <-- !!! How to call base class move assignment
        mDerivedField = std::move(other.mDerivedField);
        return *this;
    }

private:
    std::shared_ptr<int> mDerivedField;
};
```

<span id="sec_1_4_9"></span>

#### Destruction of derived types

Recall the initialization order discussed in [1.4.7](#sec_1_4_7). <u>In C++, destruction of objects takes exactly the opposite order of initialization order.</u>

> **Destruction order (simplified).** When an instantiation of a class with no virtual bases is destructed, its fields and bases are destructed in the following order:
>
> - First, the body of the destructor is executed.
> - Then, all non-static data members are destructed in the <u>reverse</u> (bottom-to-top) of the order they appear in the class definition.
> - Finally, all direct base subobjects are destructed in right-to-left order, i.e., the <u>reverse</u> of the order they appear in the list of bases.

It is important to understand why this order was chosen. Imagine you have inside `T` members in order `A`, `B`, etc., such that `B` depends on `A`, `C` depends on `B`, and so on. The initialization order ensures that by the time `B` is constructed, its dependencies are already constructed. If you destructed members in the same order as initialization, then note that `B`’s destruction might still depend on `A` existing. In this case, you will invoke undefined behaviour upon destructing `B` because `A` would already be gone.

**TL;DR**: destructing in reverse order of initialization ensures that any dependencies (either prior members or base subobjects) are still valid and alive while you are destructing a given non-static member or subobject.

If it helps you understand better, you can think of the construction as pushing onto a stack, where everything in the stack is allowed to depend on the things below it. Destruction is popping off the stack, where again, everything can depend on the things below it.

Unlike with custom constructors, your custom destructors do not have the equivalent of a member-initializer list. Upon calling a destructor, the compiler will always call the destructors for non-static member fields and base subobjects for you in the above order after executing your derived class destructor body. <u>This means that you should not call any non-static member field destructors, nor base object destructors, in your destructor bodies.</u> If you do, the destructor you call will be called more than once in total, which is undefined behaviour. In C++, you will never need to explicitly call a destructor unless you use *placement `new`*.

<span id="sec_1_4_9_1"></span>

##### Implicitly defined destructor

A destructor for a class-type `T` looks like:

`~T()`

*Implicit-declaration:* If you don’t manually write a destructor, one is always implicitly-declared for you.

*Implicit-definition:* If all bases and non-static data members have destructors which are accessible by `~T()`, then a destructor with an empty body is implicitly defined. Due to the destruction sequence described above in [1.4.9](#sec_1_4_9), this destructor has the effect of calling the destructors of all non-static data members and base subobjects in reverse-initialization order.

<span id="sec_1_4_10"></span>

#### A summary of implicitly-defined special member functions

Essentially, you can derive almost all of the rules for when a special method will be implicitly generated for you by the compiler with the principles discussed in [1.4.6](#sec_1_4_6). Here’s a table<sup><a href="#footnote36" id="footnoteret36" class="footnoteret">[36]</a></sup> for which special member functions are compiler-generated, assuming you manually write one of the others:


<table class="check-table" style="text-align: center;">
            <tbody><tr>
                <th class="noborder"></th>
                <th class="noborder" style="text-align: center;" colspan="8">If you write...</th>
            </tr>
            <tr>
                <th class="noborder" rowspan="7" style="vertical-align: middle;">The compiler supplies...</th>
                <th class="noborder"></th>
                <th>None</th>
                <th>default-ctor</th>
                <th>dtor</th>
                <th>copy-ctor</th>
                <th>copy-assign</th>
                <th>move-ctor</th>
                <th>move-assign</th>
            </tr>
            <tr>
                <th>default-ctor</th>
                <td><span class="check">✓</span></td>
                <td><span class="diamond">♦</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="cross">✕</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="cross">✕</span></td>
                <td><span class="check">✓</span></td>
            </tr>
            <tr>
                <th>dtor</th>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="diamond">♦</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓</span></td>
            </tr>
            <tr>
                <th>copy-ctor</th>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓<br><span style="color: red;">(deprecated)</span> </span></td>
                <td><span class="diamond">♦</span></td>
                <td><span class="check">✓<br><span style="color: red;">(deprecated)</span> </span></td>
                <td><span class="cross">✕</span></td>
                <td><span class="cross">✕</span></td>
            </tr>
            <tr>
                <th>copy-assign</th>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓<br><span style="color: red;">(deprecated)</span> </span></td>
                <td><span class="check">✓<br><span style="color: red;">(deprecated)</span> </span></td>
                <td><span class="diamond">♦</span></td>
                <td><span class="cross">✕</span></td>
                <td><span class="cross">✕</span></td>
            </tr>
            <tr>
                <th>move-ctor</th>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="cross">✕</span></td>
                <td colspan="2" rowspan="2">Overload resolution will result in copying</td>
                <td><span class="diamond">♦</span></td>
                <td><span class="cross">✕</span></td>
            </tr>
            <tr>
                <th>move-assign</th>
                <td><span class="check">✓</span></td>
                <td><span class="check">✓</span></td>
                <td><span class="cross">✕</span></td>
                <td><span class="cross">✕</span></td>
                <td><span class="diamond">♦</span></td>
            </tr>
        </tbody></table>


*Note:* The cells marked (deprecated) will yield a compiler warning, because relying on the implicitly-defined special member functions in these cases indicates a violation of the rule of three. Recall the discussion in [1.4.6](#sec_1_4_6).

<span id="sec_1_4_11"></span>

#### Memory layout of derived types

Non-static fields can be rearranged in the object’s memory layout based on access specifier. However, initialization order is still in top-to-bottom order as you give in your class definition.

<span id="sec_1_4_12"></span>

#### Upcasting

In C++, a reference or a pointer can always be respectively upcasted to a reference or a pointer to a base type implicitly:

```cpp
class Base { /* ... */ };

class Derived : public Base { /* ... */ };

int main() {
    Derived object{};
    Base* basePtr = &object; // implicitly converted!
    Base& baseRef = object; // implicitly converted!
}
```

(note that the actual address stored in `basePtr` may not be the same as the true address of `object` if `Derived` inherits from multiple classes — think about why).

If you want to make it explicit that a cast is happening, `Base* basePtr = static_cast<Base*>(&object)` (and similarly<sup><a href="#footnote37" id="footnoteret37" class="footnoteret">[37]</a></sup> for references) would work because it is already known at compile-time whether `Base` is an ancestor of `Derived`.

`static_cast` is meant for explicit, supported casts which are known to be valid at compile-time. `static_cast` is done at compile-time, and it performs no runtime checks to ensure correctness — you take responsibility for the cast being correct(!)

<span id="sec_1_4_13"></span>

#### Downcasting

Downcasting (converting a `Base` pointer/reference to a `Derived` pointer/reference) is trickier, because a pointer to `Base` could *actually* be pointing to a subobject of any of its derived/descendant types (but the computer doesn’t know which until runtime).

If you are <u>absolutely sure</u> that a pointer/reference to `Base` really points to a `Base` subobject of `Derived1` (and not, say `Derived2`, `Derived3`, etc.), then you may downcast like `static_cast<Derived1*>(basePtr)`. <u>In this case, you take responsibility for the correctness of the cast.</u>

Otherwise, you may use `dynamic_cast<Derived1*>(basePtr)`. A dynamic cast always performs a runtime check with the inheritance hierarchy to ensure that the pointed to object *really can be converted to the target type (here `Derived1*`)*. If the check passes, you get the adjusted pointer<sup><a href="#footnote38" id="footnoteret38" class="footnoteret">[38]</a></sup> to the `Derived1` enclosing object. Otherwise, you get a `nullptr`, so that the following pattern is common:

```cpp
Derived1* derivedPtr = dynamic_cast<Derived1*>(basePtr);
if (!derivedPtr) {
    // the conversion failed, so derivedPtr == nullptr ...
}
// successful code here...
```

Alternatively, if you dynamic cast between references, there’s no such thing as a <q>null reference</q>, so a runtime fail instead throws an exception of type `std::bad_cast`:

```cpp
try {
    Derived1& derivedRef = dynamic_cast<Derived1&>(baseRef);
    // ... successful code here ...
} catch (const std::bad_cast& e) {
    // dynamic_cast failed...
    std::cout << "e.what(): " << e.what() << "\n";
}
```

Of course, the drawback of `dynamic_cast` is that it costs you the check at runtime, making it slower than `static_cast`.

<span id="sec_1_4_14"></span>

#### Object slicing

Whenever you copy an object of derived type to an object of base type, the base object only has enough memory to store the base members. This gives the effect of <q>slicing off</q> the derived members which don’t exist in the base. For example,

```cpp
struct Base { // struct just using struct to keep the example short
    int x;
};

struct Derived: Base {
    Derived(int x, int y): Base{.x = x}, y{y} {}

    int y;
};

int main() {
    Derived derived(1, 2); // derived.x = 1, derived.y = 2
    Base base{}; // base.x = 0

    base = derived; // base.x = 1, derived.y is not copied to base.
    // Slicing: the above assignment does:
    //  1. derived is implicitly upcasted to a Base&
    //  2. Base& operator=(const Base&) copy assignment is called on base as if derived is a Base.
}
```

That may have seemed somewhat obvious. A more subtle case happens when you upcast a `Derived` *reference* to a `Base` reference and assign a `Derived` to the `Base` reference. The `Base` reference is completely unaware that it is truly a `Derived`, so slicing takes the form of a partial assignment:

```cpp
int main() {
    Derived derivedA(1, 2); // derivedA.x = 1, derivedA.y = 2
    Derived derivedB(3, 4); // derivedB.x = 3, derivedB.y = 4

    Base& baseRef = derivedA; // implicit upcast is okay.

    baseRef = derivedB; // derivedA.x = 3, derivedA.y is unchanged, still 2 (!!)
    // Slicing: the following assignment does
    //  1. derivedB is implicitly upcasted to a Base&
    //  2. Base& operator=(const Base&) copy assignment is called on the base 
    //      *subobject of derivedA*, so only the Base part of derivedB is copied
    //      over to the Base part of derivedA.
}
```

<span id="sec_1_4_15"></span>

#### A note on ‘is-a’ relationships

In many texts, it is common to say that (public) inheritance establishes an <q>is-a</q> relationship. Namely, if $B$ inherits from $A$, it is often said that $B$ <q>is-a(n)</q> $A$. This wording is misleading. Consider the following classes:

```cpp
class Rectangle {
public:
    void setWidth(float newWidth)
    {
        assert(newWidth >= 0);
        mWidth = newWidth;
    }
    void setHeight(float newHeight)
    {
        assert(newHeight >= 0);
        mHeight = newHeight;
    }
    float getWidth() const { return mWidth; }
    float getHeight() const { return mHeight; }

private:
    float mWidth;
    float mHeight;
};

class Square : public Rectangle {
public:
    // How can these be implemented in a way that would be consistent with our getters?
    void setWidth(float newWidth);
    void setHeight(float newHeight);
};
```

Using <q>$B$ is-an $A$</q> as an intuition for whether $B$ should derive from $A$ is imprecise and can lead to bad design decisions. Obviously one would say that a square <q>is a</q> rectangle — in particular, squares are the subset of rectangles whose widths are restricted to be equal to their heights. However, types (and their relationships) are characterized by their fields and their public interfaces, *not by relationships in other aspects of their structure*.

As we alluded to in [1.4.2.1](#sec_1_4_2_1), $B$ is a subtype of $A$ if and only if $B$ *substitutes for* $A$. Practically speaking, as a designer, you want to publicly derive from another class only when you want to be able to say that your derived class can be used anywhere you’d want the base class’s features (methods and fields).

<span id="sec_1_5"></span>

### Polymorphism

Recall our motivating example ([1.2](#sec_1_2)). In our original implementation, what would it take to store a homogeneous *collection* (say, a `std::vector`) of `Shape`s? One way would be to store a tagged union like so:

```cpp
struct Shape {
    union {
        Circle circle;
        Rectangle rectangle;
    };
    ShapeType type;
};
```

(in the C++ standard library, the `variant` header implements a tagged union for you as `std::variant`, such that you can do `using Shape = std::variant<Circle, Rectangle>;`). Since we then have a homogeneous abstracted representation of `Circle` and `Rectangle`, we can then say `std::vector<Shape> shapes`.

What’s the cost of this? First, the `union` takes at least much space as its largest member, and will furthermore have alignment equal to the largest `alignof` of any union member. That means that if at least *one* shape takes a lot of memory to store, all the other shapes (no matter how small) will take as much memory. Second, we need to pay the price of the `ShapeType` enum. This is typically 4 bytes, but in practice the price that we pay for the enum is actually the max alignment of the union members (which, if you have any `double`s or pointers is at least 8 bytes).

This can be a pretty steep price to pay to obtain a collection of homogeneous abstractions. If you instead say

```cpp
struct Shape {
    union {
        Circle* circlePtr;
        Rectangle* rectanglePtr;
    };
    ShapeType type;
};
```

you can save a bit — by losing contiguity of the storage of each shape, you don’t tie the memory cost of each `Shape` to the largest concrete shape type. Even here though you still pay for the `type` enum.

This is not even mentioning the largest pain point we mentioned in [1.2](#sec_1_2). Remember that extending this implementation to new `Shape`s means requiring access to each function implementation that touches `Shape`, and editing the `switch (type)` of each one!

From a bird’s eye view, we’d like to be able to do three things here. (Not) coincidentally, they’re the main problems I presented to you in [1.2](#sec_1_2), but I’ll paraphrase them here to jog your memory:

1.  *(Interface)* We’d like to have a shared, homogeneous representation of abstracted types (so that we could store them together in collections, for example).
2.  *(Method dispatch)* We’d like to be able to call the *most specific* method implementations for each instance of the abstracted type. For example, if I stored a `Circle` and a `Rectangle` together in a `std::vector<Shape>`, calling `shape.area()` should call the `Circle`-specific and `Rectangle`-specific implementations.

But again, our variant-based solution solves these two problems by neglecting a major third problem:

3.  *(Abstractions should not depend on concrete implementations)* — solving this would allow us to add new concrete implementations (e.g., `Pentagon`) satisfying interfaces (e.g., `Shape`) without modifying all the code that relies on the abstract type.

We need to try a different angle. With encapsulation and inheritance, C++ class-types solve problems 1 and 3. In particular, we’ve seen how base classes are abstractions of their derived types (problem 1), and furthermore, that they *do not depend at all* on the implementations (or even the *existence* of) their derived types (problem 3).

Polymorphism (i.e., <q>many forms</q>) is the pillar of OOP that solves problem 2.

<span id="sec_1_5_1"></span>

#### Name lookup and hiding/shadowing (in slightly more detail)

We’ve previously covered name hiding twice (in the aside of [1.4.1](#sec_1_4_1), and in the brief coverage of method overriding in [1.4.2.2](#sec_1_4_2_2)) to show how we can make method implementations more specific in derived classes, but also that they fail to perform dynamic method dispatch from base pointers/references. To recap, when you use a name (of a variable, function/method, class member, namespace, type, etc.) in some scope, a *name lookup* is performed.

The typical pattern of a lookup for an unqualified name looks *roughly* like this:

- First, the most-nested enclosing scope is scanned from the name usage upwards until we exit the beginning of the scope.
- Then, one level up, name lookup scans upwards from the beginning of the most-enclosing scope until we exit the second-most enclosing scope. **Note** that we <u>never</u> recurse deeper into a sibling/cousin/etc. scope, we can only <q>exit</q> scopes.
- And so on, until we reach the top of global scope.

Here’s an example of lookup at namespace/global scope that demonstrates these rules:

```cpp
int a = 1;
int b = 2;

namespace A {
    int b = 3; // from here on until the end of A, hides ::b.

    namespace B {
        int b = 4; // this is IGNORED by the lookup in C, because it requires recursing back in.
    }

    namespace C {
        int c = a; // = 1, lookup searches A::b, then ::a.
        int d = b; // = 3, lookup searches A::B::c, then A::b (hence ::b is hidden)
        int e = f; // ERROR: lookup goes "up", not down.
    }

    int f = 4;
}
```

But there are some exceptions/nuances to the pattern (which we will non-exhaustively mention here). For example, a lookup initiated within a non-member function definition will proceed in the above pattern until it exits the function definition, after which it will start popping off the scope stack around the function <u>declaration</u>, until the function definition is reached. After this, it proceeds in the usual manner by searching above the enclosing namespace:

```cpp
int i = 6;                          // found sixth
namespace A {
    namespace B{
        namespace C{
            void f();
            int i = 3;              // found third
        }
        int i = 4;                  // found fourth
    }

    int i = 5;                      // found fifth

    void B::C::f() {
        int i = 2;                  // found second
        {
            int i = 1;              // found first
            std::cout << i << '\n'; // lookup initiated
        }
    }
    // int i;                       // would not be found
}
// int i;                           // would not be found
```

Try commenting out specific lines: <a href="https://godbolt.org/z/E39eq17ea" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

Inside class methods, the pattern is slightly different — name lookup scans the entire enclosing class scope (not just above the method), after which it scans the entire base class scope, and recursively into its bases until it finishes scanning the highest base class(es). After this, we proceed in the usual manner by scanning upwards from the class definition and popping off the namespaces which enclose it until we reach the top of global scope.

Somewhat similarly, making a method call will scan the class (of the object), and then its bases (recursively). This is the <q>rule</q> which describes why method names can be hidden in derived classes.

Hence, in an example like:

```cpp
class Base {
public:
    void foo() const {
        std::cout << "Hello, Base!\n";
    }
};

class Derived: public Base {
public:
    void foo() const {
        // If this implementation wasn't here, we'd inherit Base's implementation of foo().
        std::cout << "Hello, Derived!\n";
    }
};

int main() {
    Derived derived{};
    derived.foo(); // prints "Hello, Derived!"
    // (so would a pointer to derived, or a reference to derived.)

    Base* basePtr = &derived; // implicit upcast is okay!
    basePtr->foo(); // prints "Hello, Base!" :(
}
```

<a href="https://godbolt.org/z/Po5YG9jPq" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

`Derived::foo` *hides/shadows* `Base::foo` when you call `derived.foo()`. Again, unnfortunately this name hiding/shadowing will apply *even when `Derived::foo` has a different signature than `Base::foo`*!

The same reasoning shows why `basePtr` fails to call `Derived::foo` — a call to `basePtr->foo()` has name lookup search `Base`’s scope, where `Base::foo` is the first match found. The same would happen if you did `Base& baseRef = derived; baseRef.foo();`.

Let’s try this with our original motivating example. Suppose I have `class Circle: public Shape` and a public method inside `Shape` which I shadow:

```cpp
class Shape {
public:
    float area() const { 
        // some dummy implementation to be overriden
        return 0;  
    }
};

class Circle: public Shape {
public:
    // ...
    float area() const { /* return pi r^2 */ }
    // ...
};
```

We know from our upcasting rules ([1.4.12](#sec_1_4_12)) that a `Circle&` is implicitly convertible to a `Shape&`, so we can do this:

```cpp
Circle circle(/* details unimportant */);
Shape& abstractedCircle = circle;
```

If I call `abstractedCircle.area()`, the name lookup sees that we are looking for the name `area` in the context of a `Shape`. Name lookup will begin in the scope `class Shape { /* ... */ };` and never see `Circle::area`. So `abstractedCircle.area()` will give us `0`! It fails to achieve method dispatch in the way that we want.

Solving this problem is the purpose of the `virtual` keyword. When you mark a method `virtual`, you communicate that the method should be *dynamically dispatched* to the most-derived relevant implementation when it is called through a reference or a pointer.

<span id="sec_1_5_2"></span>

#### Dynamic dispatch with virtual methods

To enable dynamic dispatch on a method, you just prefix its declaration with `virtual`:

```cpp
class Shape {
public:
    virtual float area() const { /* some dummy implementation: */ return 0; }
};
```

Then, when you derive from a `class`/`struct` with a `virtual` method, the derived class inherits the method:

```cpp
class Circle: public Shape {
    //  float area() const is inherited and is still virtual.
};
```

The virtual nature of a `virtual` method is inherited as well. To override it, you just need to redefine the method with <u>the same signature and return type</u> (technically, neither `virtual` nor `override` is necessary to do the overriding in the derived class):

```cpp
class Circle: public Shape {
public:
    Circle(float x, float y, float r): mPosX{x}, mPosY{y}, mRadius{r} {}

    // overrides Shape::area.
    float area() const {
        // requires #include <numbers> in C++20
        return std::numbers::pi * mRadius * mRadius;
    }

private:
    float mPosX;
    float mPosY;
    float mRadius;
};
```

Then, if you call the `virtual` method via a pointer or reference to the base class, the derived implementation `Circle::area` gets called:

```cpp
int main() {
    Circle circle(0, 0, 1);
    Shape* shapePtr = &circle; // implicit upcast is okay!
    std::cout << shapePtr->area() << '\n'; // prints "3.14159"! Dynamic dispatch is successful!
}
```

<a href="https://godbolt.org/z/e1PovhnMW" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

Note that because the true type that a base reference/pointer refers to can change *at runtime*, the method executed is chosen at runtime too. Hence, this form of method dispatch is called *dynamic dispatch*<sup><a href="#footnote39" id="footnoteret39" class="footnoteret">[39]</a></sup>.

<span id="sec_1_5_2_1"></span>

##### A note on the special member functions and virtual

Remember that the constructors, destructor, and assignment operators are not inherited, instead having special treatment through implicitly-defined implementations and special initialization/destruction sequences. Because these methods are special, there are some notes about virtualizing them:

> - **There is no such thing as a `virtual` constructor.** A virtual call allows us to call a concrete function knowing only about a partial interface and not the exact type of an object. In particular, the object needs to already have been created (with complete information) for it to make sense to then abstract it and then call methods on it. A `virtual` constructor makes no sense. [Straight from the horse’s mouth](https://www.stroustrup.com/bs_faq2.html#virtual-ctor).
>
> - **It is possible to make assignment operators `virtual`, but not recommended.** Suppose you did make your assignment operator `virtual`. For example:
>
>   ``` cpp
>   class A {
>   public:
>       virtual A& operator=(const A& other) {
>           /* details unimportant */
>           return *this;
>       }
>   };
>   ```
>
>   Remember that an overriding implementation must have the same function signature, so the parameter of our overriding derived assignment operator must *also be `const A&`*(!) And if we kept going on with `class C: public B`, it would need to override `C& operator=(const A&)`, `C& operator=(const B&)`, and then make a new `C& operator=(const C&)`, and the total number of these you’d need to write would increase geometrically ($O(n^2)$) with length of the chain of inheritance!
>
>   Furthermore you get issues with object slicing (if you assign a further derived class to one of its ancestor classes, do you just slice it?), or how do you handle when two sibling types get assigned to eachother?
>
>   For these reasons we do not recommend making assignment operators virtual.
>
> - **It is strongly recommended to make destructors `virtual`, if you intend to use the class polymorphically at all. We discuss this shortly in [1.5.3](#sec_1_5_3).**

<span id="sec_1_5_2_2"></span>

##### override Keyword

You may recall that we can optionally suffix overriding declarations with `override`. This is not necessary, but is good practice because:

1.  It makes it easier for you, or any other readers of your code, to see at a glance that the method implementation is overriding a base implementation.
2.  The compiler will check for you, at compile-time, that the method signatures match, that the return types match<sup><a href="#footnote40" id="footnoteret40" class="footnoteret">[40]</a></sup>, and that you are actually overriding a base method as you are expecting.

In the above example, you just need to modify the overriding declaration like so:

```cpp
class Circle: public Shape {
public:
    // ...

    // overrides Shape::area.
    float area() const override;

    // ...
}; 

// Just so you see how it looks when you separate declaration from implementation -- you don't 
// need to re-state virtual or override here:
float Circle::area() const {
    // requires #include <numbers> in C++20
    return std::numbers::pi * mRadius * mRadius;
}
```

<a href="https://godbolt.org/z/sPrcsKzqa" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

Here’s what the error looks like when you, for example, write `double area() const override;` in `Shape` instead (which doesn’t match the signature of `Base::area`):

```
<source>:15:12: error: conflicting return type specified for 'virtual double Circle::area() const'
   15 |     double area() const override;
      |            ^~~~
<source>:7:19: note: overridden function is 'virtual float Shape::area() const'
    7 |     virtual float area() const { /* some dummy implementation: */ return 0; }
      |                   ^~~~
```

<a href="https://godbolt.org/z/E6Koxe14e" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

<span id="sec_1_5_2_3"></span>

##### final Keyword

You can also mark a `virtual` method such that derived classes cannot override it any further. You can use it with or without using the `override` keyword. For example,

```cpp
class A {
public:
    virtual void foo() { std::cout << "A\n;"; }
};

class B: public A {
public:
    void foo() override final { std::cout << "B\n"; }
};

class C: public B {
public:
    // uncommenting this would cause a compilation error!
    // void foo() override { std::cout << "C\n"; }
};

int main() {
    C obj{};
    A& aRef = obj;
    aRef.foo(); // prints "B"
}
```

<a href="https://godbolt.org/z/exzcMcYzT" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

<span id="sec_1_5_2_4"></span>

##### Covariant return types

If you have a `virtual` method which returns either a reference or a pointer to some class-type, overriding implementations are allowed to return (respectively) a reference/pointer to a subclass of the base return type.

For example, suppose we had a database of people, some of whom are students. We can imagine the `people` table having columns `id` (primary key) and `name`, and the `students` table having information like `grade` and the original id of the student as a person (call it `personId`) (so that joins are possible). We now have an inheritance relationship between the more general `PersonInfo` and the more specific `StudentInfo` (which can subclass the `PersonInfo`). Thus, any method which *returns* a `PersonInfo*` can be overriden by a method which returns a `StudentInfo*`:

```cpp
struct PersonInfo {
    uint64_t id;
    std::string name;
};
        
struct StudentInfo: PersonInfo {
    // inherits id, name from personInfo.
    int grade;
};

class PersonInfoRetriever {
public:
    virtual PersonInfo* getInfo(uint64_t id) const {
        /* Something like SELECT id, name FROM people WHERE id={id} */
    }
};

class StudentInfoRetriever: public PersonInfoRetriever {
public:
    // covariant return type: you can return a "more specific" pointer/reference 
    // when overriding a base virtual method which returns a pointer/reference.
    StudentInfo* getInfo(uint64_t id) const override {
        /* 
            Something like SELECT * FROM people WHERE id={id}
            INNER JOIN students ON people.id = students.personId;
        */
    }
};
```

You can check that this actually compiles (assuming some dummy implementations to mock out the database) by running it yourself here: <a href="https://godbolt.org/z/7rxeTWhPq" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

If you modify the `getInfo` methods to return object values instead of pointers/references, you get the following error:

```
<source>:34:17: error: invalid covariant return type for 'virtual StudentInfo StudentInfoRetriever::getInfo(uint64_t) const'
   34 |     StudentInfo getInfo(uint64_t id) const override {
      |                 ^~~~~~~
<source>:21:24: note: overridden function is 'virtual PersonInfo PersonInfoRetriever::getInfo(uint64_t) const'
   21 |     virtual PersonInfo getInfo(uint64_t id) const {
      |                        ^~~~~~~
```

<span id="sec_1_5_3"></span>

#### Virtual destructors

Since `virtual` is required to enable dynamic dispatch on a method, and we know that there is a destruction order (as given in [1.4.9](#sec_1_4_9)), let’s make sure that the destruction order still does what we want when we `delete` via a pointer to base:

```cpp
class A {
public:
    ~A() {
        std::cout << "~A() called\n";
    }

    int x;
};

class B: public A {
public:
    ~B() {
        std::cout << "~B() called\n";
    }

    int y;
};

class C: public B {
public:
    ~C() {
        std::cout << "~B() called\n";
    }

    int z;
};

int main() {
    A* basePtr = new C{}; // new C{} gives a C*, which we upcast to A*.
    delete basePtr; // which destructor gets called?
}
```

<a href="https://godbolt.org/z/oqsrvhPvY" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

If you run the above program, you’ll see this output:

```
~A() called
```

Only the base destructor got called! In fact, if you <a href="https://godbolt.org/z/scMWoePG7" target="_blank" rel="noopener noreferrer">compile with the flag <code>-fsanitize=address</code></a>, the address sanitizer gives you the following error:

```
object passed to delete has wrong type:
size of the allocated type:   12 bytes;
size of the deallocated type: 4 bytes.
```

before the program even finishes running. What’s going on here? According to the destruction order, we first run the body of the destructor. Statically, all the compiler knows is that `basePtr` points to an `A`, so `~A()` is called. Then `~int()` is called on the `A` subobject’s only member (`int x`)<sup><a href="#footnote41" id="footnoteret41" class="footnoteret">[41]</a></sup>, and then since `A` has no bases, nothing else happens.

If `B` or `C` managed heap memory (e.g., through a `std::vector` member), missing their destructor calls would fail to free that memory too. Clearly, this is undesirable.

> **TL;DR of this section: If you ever intend to destroy a derived object through a base reference/pointer, you should mark its destructor `virtual`. If you have any other `virtual` methods at all in your class, it’s a good idea to just mark the destructor `virtual` by default anyways<sup><a href="#footnote42" id="footnoteret42" class="footnoteret">[42]</a></sup>.**

If we mark the base destructor `virtual` to the code above:

```cpp
class A {
public:
    virtual ~A() {
        std::cout << "~A() called\n";
    }

    int x;
};

// everything else the same...
```

We get the (desired) output

```
~C() called
~B() called
~A() called
```

<a href="https://godbolt.org/z/WEEfYMs5z" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

And our address sanitizer is happy as well.

When `delete basePtr;` runs, the destructor gets dynamically dispatched to the most-derived relevant destructor, `~C()`. Then the destruction sequence gets initiated, destructing non-static data members in reverse order before (depth-first) recursively calling base destructors, and so on.

<q>But wait!</q>, you cry. You’ve been paying attention and in [1.4.5](#sec_1_4_5), you remember that *destructors are not inherited*, so there’s nothing to override! How can a `virtual` destructor be overriden if it’s not even inherited?

But alas, some things in life are not so simple. The special methods get... special treatment. Destructors are not inherited but can still be overriden<sup><a href="#footnote43" id="footnoteret43" class="footnoteret">[43]</a></sup>. If you mark a base destructor `virtual`, then all of the class’s descendant classes have `virtual` destructors too, and they all override your base class’s destructor. Why? So that polymorphic destruction is possible.

And yes, even though the derived destructors override your base destructor, all the base destructors still get called in most-derived-to-least-derived order, as specified in [1.4.9](#sec_1_4_9), and as shown in the example above.

<span id="sec_1_5_4"></span>

#### Abstract classes

Abstract classes let your base classes act like fill-in-the-blank types — they are classes which can only be used as a base and not instantiated directly. More precisely, abstract classes cannot be instantiated because they have methods which have not been implemented and must be overriden (with an implementation) in a derived class. These methods are called *pure virtual functions*.

An abstract class is any class that has *any* pure virtual methods.

<span id="sec_1_5_4_1"></span>

##### Pure virtual functions

A pure virtual function is a non-static `virtual` class method which is marked `= 0;`, like so:

```cpp
class Shape {
public:
    virtual float area() const = 0;
    virtual ~Shape() = default; // support polymorphic deletion through a ptr/ref to Shape.
};
```

<a href="https://godbolt.org/z/7863ezvnc" target="_blank" rel="noopener noreferrer">Run it yourself!</a> Attempting to instantiate the above `Shape` yields an error like so:

```
<source>: In function 'int main()':
<source>:7:11: error: cannot declare variable 'shape' to be of abstract type 'Shape'
    7 |     Shape shape{}; // ERROR
      |           ^~~~~
<source>:1:7: note:   because the following virtual functions are pure within 'Shape':
    1 | class Shape {
      |       ^~~~~
<source>:3:19: note:     'virtual float Shape::area() const'
    3 |     virtual float area() const = 0;
      |                   ^~~~
```

In order to instantiate a derived class of `Shape`, we must override <u>all</u> of its pure virtual methods with implementations, lest we remain abstract ourselves:

```cpp
class Circle: public Shape {
public:
    Circle(float x, float y, float r): mPosX{x}, mPosY{y}, mRadius{r} {}

    float area() const override {
        return std::numbers::pi * mRadius * mRadius;
    }

private:
    float mPosX;
    float mPosY;
    float mRadius;
};

int main() {
    Circle circle(0, 0, 1); // successfully instantiates!
}
```

<a href="https://godbolt.org/z/5TasPPqY1" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

This is far more preferable than our previous `Shape` examples, where we just provided a dummy implementation returning an area of `0`, because it allows you to distinguish between a degenerate shape (returns area of `0`) and one that just hadn’t been implemented (cannot be instantiated).

<span id="sec_1_5_4_2"></span>

##### Interfaces

Abstract classes are a strict superset of what are known as interfaces in general (non-C++-specific) OOP. An *interface* is just a contract; a collection of methods which a class is required to implement (all of) in order to say that the class *implements* the interface.

In C++, you can write an interface by writing an abstract class that is composed of just pure virtual functions, and specifically no data members nor inheritable method implementations. The `Shape` `class` above is an example of an interface. Here’s another example:

```cpp
class Drawable {
    class RenderTarget;  // forward declare
    struct RenderStates; // forward declare

    virtual ~Drawable() = default;
protected:
    virtual void draw(RenderTarget& target, RenderStates states) const = 0;
};
```

The above is a simplified version of the `Drawable` interface for drawable objects in SFML. You can also extend interfaces and still remain an interface — here’s a toy example:

```cpp
class Person {
public:
    virtual const std::string& name() const = 0;
    virtual ~Person() = default;
};

class Customer: public Person {
public:
    // inherits the requirement of a name() method with the 
    // same signature + return type as above.

    // another method one must implement
    virtual void charge(int64_t cents) = 0;
};
```

<span id="sec_1_5_4_3"></span>

##### Non-virtual interface pattern

What’s the point of abstract classes which aren’t interfaces? One example is the non-virtual interface pattern (NVI). The NVI pattern is used when you want to be able to override some core functionality, but also recognize that there is common structure *surrounding* that core customizable function.

The NVI idiom attempts to modularize customizable (overridable) functionality to be as small as possible in the subclasses, while keeping all of the common, overarching functionality in the public interface of the base class. This minimizes the fragility of the entire inheritance hierarchy by maximizing the control of the base class. If you minimize the control of the subclasses to override into small modular chunks, it’s easier to make changes in the base class without worrying that you’ll render derived classes useless.

The NVI idiom works as follows (paraphrasing from Herb Sutter<sup><a href="#footnote44" id="footnoteret44" class="footnoteret">[44]</a></sup>):

- All public methods are non-`virtual`. These methods are the common overarching structure, and call the <q>hooks</q> (`virtual functions`) that the derived can override.
- Prefer to make virtual functions `private` (you can still override these in derived classes, even if the derived class cannot directly access them).
- Only if derived classes need to invoke the base implementation should you mark them `protected` in the base.
- A base class destructor should be either public and virtual, or protected and nonvirtual.

Here’s a toy C++ example that just wraps an action with logs saying when the action has begun and ended.

```cpp
class ActionLoggable {
public:
    virtual ~ActionLoggable() = default;

    // Non-virtual common functionality:
    void action() {
        std::cout << "[INFO] " << name() << " has started action...\n";
        doAction();
        std::cout << "[INFO] " << name() << " has completed action...\n";
    }
private:
    // These are the customizable "hooks":
    virtual const std::string& name() const = 0;
    virtual void doAction() = 0;
};

class Person: public ActionLoggable {
public:
    Person(const std::string& name): mName{name} {}

private:
    const std::string& name() const override {
        return mName;
    }

    void doAction() override {
        // custom action here, for example:
        std::cout << "\t" << mName << " is eating lunch!\n";
    }

    std::string mName;
};

int main() {
    Person person("Jack");
    person.action();
}
```

Which prints

```
[INFO] Jack has started action...
    Jack is eating lunch!
[INFO] Jack has completed action...
```

<span id="sec_1_5_5"></span>

#### Run-time type information (RTTI)

What if you want to know information about what *exactly* a polymorphic reference/pointer is storing (is my `Animal` pointer actually pointing at a `Cat` or a `Dog`)? C++ has facilities for this called run-time type information (RTTI). It’s in the name: it’s **run-time** type information because the specific derived class referred to by a polymorphic reference/pointer can only be known at runtime. For example, suppose you had some animals:

```cpp
class Animal {
public:
    virtual ~Animal() = default;
    virtual void speak() const = 0;
};

class Dog: public Animal {
public:
    void speak() const override {
        std::cout << "Bark!\n";
    }
};

class Cat: public Animal {
public:
    void speak() const override {
        std::cout << "Meow.\n";
    }
};
```

and say you wanted to put them into a `std::vector`:

```cpp
std::vector<std::unique_ptr<Animal>> animals = { /* ... randomly insert dogs or cats ... */ };
```

How could you know which animal is which type? One tempting naive solution is to do something like this:

```cpp
class Animal {
public:
    enum AnimalType {
        DOG,
        CAT
    };
    virtual AnimalType type() const = 0;

    // .. other stuff as above
};

class Dog: public Animal {
public:
    AnimalType type() const override {
        return AnimalType::DOG;
    }
    
    // ... other stuff as above
};

class Cat: public Animal {
public:
    AnimalType type() const override {
        return AnimalType::CAT;
    }
    
    // ... other stuff as above
};
```

This should raise alarms in your head. Suddenly, the base class once again depends on the derived classes (if you add another animal, you’ll need to modify the `AnimalType` enum). Each `Animal` subclass will need to implement another boilerplate method. This is not beautiful code.

Enter `typeid`. First, include the `<typeinfo>` header:

```cpp
#include <typeinfo>
```

And now you can call `typeid(TypeName)` or `typeid(polymorphicReference)`<sup><a href="#footnote45" id="footnoteret45" class="footnoteret">[45]</a></sup> like so:

```cpp
for (const auto& animalPtr: animals) {
    if (typeid(*animalPtr) == typeid(Dog)) {
        std::cout << "Dog\n";
    } else if(typeid(*animalPtr) == typeid(Cat)) {
        std::cout << "Cat\n";
    }
    // Note that typeid gives you the derived type, even though you passed 
    // it a base reference (const Animal&)
}
```

`typeid` returns a `const std::type_info&`. `std::type_info` is part of the `<typeinfo>` header you included. This object provides insights about the derived type stored in a polymorphic reference, ignoring things like `const`-qualifiedness. In particular, you can query (non-exhaustively):

- **Equality of types**: like above `typeid(*animalPtr) == typeid(Dog)`
- **Hashes for types**: `typeid(*animalPtr).hash_code()`
- **Names for types**: `typeid(*animalPtr).name()`

Note that there is no guarantee that names and hashes will be consistent for the same type across different program runs (only within the same run). Furthermore, names are typically a bit mangled and implementation-defined<sup><a href="#footnote46" id="footnoteret46" class="footnoteret">[46]</a></sup>.

`typeid` has some value over `dynamic_cast` for checking run-time type information in non-polymorphic contexts. For example, if you’re only checking whether two types are equal (say, in a `virtual bool operator==(const Base& other) const` implementation), checking `typeid(*this) == typeid(other)` takes constant time while doing a `dynamic_cast` needs to traverse the inheritance hierarchy at runtime.

<span id="sec_1_5_6"></span>

#### How is polymorphism implemented?

Now that we have seen the main features of polymorphism and how we can take advantage of dynamic dispatch, we look at the inner mechanisms of how polymorphism is implemented in C++. While the C++ standard does not mandate specifically how dynamic dispatch must be implemented, the implementation across compilers are typically similar enough that we can discuss one implementation.

Let’s think about what dynamic dispatch means fundamentally. Suppose we have classes `Base` and `Derived` like so:

```cpp
class Base {
public:
    virtual void foo() { /* ... details unimportant ... */ }
};

class Derived: public Base {
public:
    void foo() override { /* ... details unimportant ... */ }
};
```

Dynamic dispatch means that given limited compile-time information (the compiler only knows the base type of the reference/pointer and the signature of a method being called):

```cpp
Base* basePtr = /* ... the compiler doesn't know for sure because we could've passed 
                        this around via function calls or casts ... */ 
basePtr->foo(); // Should Base::foo() be called or Derived::foo()?
```

that the compiler has stored enough information *at runtime* to determine which version to call.

First, let’s focus on: **what can the compiler know for sure at compile-time**? One thing is that given we have a *specific (derived) type* in mind, the specific implementations for all of its methods are also known. This is determined by our rules for inheriting methods and overriding them. Remember that in C++, the type-system is static — types do not change at runtime (only instantiations).

Then, we can associate each specific *type* to a mapping of each of its `virtual` method signatures to a function pointer that stores the location of the corresponding compiled machine code in memory. We can represent these as *tables* that look like...


<table style="margin-left:auto;margin-right:auto;">
                <tbody><tr>
                    <th colspan="2">Table for <code>Base</code></th>
                </tr>
                <tr>
                    <th>Method</th>
                    <th>Function address</th>
                </tr>
                <tr>
                    <td><code>void foo()</code></td>
                    <td>0x55555555518c</td>
                </tr>
            </tbody></table>


\


<table style="margin-left:auto;margin-right:auto;">
                <tbody><tr>
                    <th colspan="2">Table for <code>Derived</code></th>
                </tr>
                <tr>
                    <th>Method</th>
                    <th>Function address</th>
                </tr>
                <tr>
                    <td><code>void foo()</code></td>
                    <td>0x5555555551ac</td>
                </tr>
            </tbody></table>


*Note: you may recall from [1.5.2.2](#sec_1_5_2_2) that the return type is not part of the method signature. I have included it in the table for ease-of-reading anyways, even though it is not necessarily included in reality.*

And then, supposing each type had such a table, all we have to do at runtime is associate each actual object to the table(s) corresponding to its true underlying type.

At a high level, this means there are two mappings:

1.  **Per class type, at compile-time**: A table mapping all `virtual` method signatures to the address of its specific implementation for the type.
2.  **Per instantiated object, at run-time**: A pointer to the table corresponding to the object’s true underlying type.

In fact, this *is* roughly how dynamic dispatch is implemented. The first (static) mapping is called the *virtual method table (vtable)*, and the second is called the *virtual pointer (vptr)*.

> **Dynamic dispatch (simplified).** When you call a `virtual` method through a base reference/pointer, it first uses the object’s vptr to find the correct derived type’s vtable, and then looks up the method in the vtable to dynamically dispatch the call.

The above description is basically correct in the simplest types of inheritance, but can look a bit different in more complicated scenarios. We now explore them in detail in [1.5.6.1](#sec_1_5_6_1) and [1.5.6.3](#sec_1_5_6_3).

<span id="sec_1_5_6_1"></span>

##### Simple inheritance

Consider the following code:

```cpp
class Base {
public:
    virtual void foo() {}
    virtual void fooNotOverriden() {}

    int32_t baseField;
};

class Derived: public Base {
public:
    void foo() override {}

    uint64_t derivedField;
};
```

Here are the member function pointers stored in the vtable of Base:


<table style="margin-left:auto;margin-right:auto;">
            <tbody><tr>
                <th colspan="2">(part of) vtable for <code>Base</code></th>
            </tr>
            <tr>
                <th>Method</th>
                <th>Function address</th>
            </tr>
            <tr>
                <td><code>Base::foo()</code></td>
                <td>0x55555555518c</td>
            </tr>
            <tr>
                <td><code>Base::fooNotOverriden()</code></td>
                <td>0x55555555519c</td>
            </tr>
        </tbody></table>


And here are the methods stored in the vtable of Derived:


<table style="margin-left:auto;margin-right:auto;">
            <tbody><tr>
                <th colspan="2">(part of) vtable for <code>Derived</code></th>
            </tr>
            <tr>
                <th>Method</th>
                <th>Function address</th>
            </tr>
            <tr>
                <td><code>Derived::foo()</code></td>
                <td>0x5555555551ac</td>
            </tr>
            <tr>
                <td><code>Base::fooNotOverriden()</code></td>
                <td>0x55555555519c</td>
            </tr>
        </tbody></table>


Each of the function pointers above point into the text segment (code segment) of memory, where the machine code for these implementations live. The key point to notice here is that `Derived`’s vtable entry for `fooNotOverriden()` points at exactly the same address as `Base`’s entry.

What happens when we instantiate a couple of `Base`s and a couple of `Derived`s?

```cpp
int main() {
    Base b1{}, b2{};
    Derived d1{}, d2{};

    std::cout << "Base has size " << sizeof(b1) << " bytes and an alignment of "
              << alignof(b1) << " bytes\n";
    std::cout << "Derived has size " << sizeof(d1) << " bytes and an alignment of "
              << alignof(d1) << " bytes\n";
}
```

<a href="https://godbolt.org/z/5ab3KGahr" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

What should these output? if we run the above with g++ 15.2, we get:

```
Base has size 16 bytes and an alignment of 8 bytes
Derived has size 24 bytes and an alignment of 8 bytes
```

But remember that `Base` only had a `int` member field (4 bytes) and `Base` only has the inherited `int` and a `double` (8 bytes). Furthermore, `int`s only have a 4 byte alignment, so you’d expect `Base` to have a 4 byte alignment as well. Let’s inspect what’s going on in `Base`:

```cpp
int main() {
    // ... as above 
    std::cout << "Address of b1 is \t\t" << &b1 << '\n';
    std::cout << "Address of b1.baseField is\t" << &b1.baseField << '\n';
}
```

<a href="https://godbolt.org/z/hrzE4Gerr" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

We get the following additional output:

```
Address of b1 is          0x7ffe61b25e70
Address of b1.baseField is  0x7ffe61b25e78
```

So `Base`’s only non-static data member is being stored 8 bytes offset from the beginning of `Base`. But remember that `Base` has a size of 16 bytes, and `b1.baseField` is only `4` bytes, meaning there is actually an additional 4 bytes after `baseField` inside `Base`. So our memory layout for `Base` looks something like:


<table>
            <tbody><tr>
                <th colspan="3"><code>class Base</code> memory layout</th>
            </tr>
            <tr>
                <td>???</td>
                <td><code>int32_t baseField</code></td>
                <td>???</td>
            </tr>
            <tr>
                <td>8 bytes</td>
                <td>4 bytes</td>
                <td>4 bytes</td>
            </tr>
        </tbody></table>


Well, the last 4 bytes can be easily explained. Since the alignment of `Base` is 8, the last 4 bytes are just padding so that `sizeof(Base) % 8 == 0`. So really the table is:


<table>
            <tbody><tr>
                <th colspan="3"><code>class Base</code> memory layout</th>
            </tr>
            <tr>
                <td>???</td>
                <td><code>int32_t baseField</code></td>
                <td>(padding)</td>
            </tr>
            <tr>
                <td>8 bytes</td>
                <td>4 bytes</td>
                <td>4 bytes</td>
            </tr>
        </tbody></table>


But why is the alignment 8 in the first place? Let’s try something else — let’s print these questionable extra bytes in both `b1` and `b2` to see if there’s a pattern. We’ll also set the `baseField` to `7` and `0xffffffff` (this all 1s for 32 bits) in `b1`, `b2` respectively so we can orient ourselves:

```cpp
int main() {
    // ... as above

    b1.baseField = 7;
    b2.baseField = 0xffffffff;
    char* byteViewB1 = reinterpret_cast<char*>(&b1);
    char* byteViewB2 = reinterpret_cast<char*>(&b2);
    std::cout << "b1 in hex is: ";
    for (size_t i = 0; i < sizeof(b1); ++i) {
        std::cout << std::setfill('0') 
                  << std::setw(2) 
                  << std::hex 
                  << static_cast<int>(byteViewB1[i] & 0xFF) << " ";
    }
    std::cout << '\n';
    std::cout << "b2 in hex is: ";
     for (size_t i = 0; i < sizeof(b2); ++i) {
        std::cout << std::setfill('0') 
                  << std::setw(2) 
                  << std::hex 
                  << static_cast<int>(byteViewB2[i] & 0xFF) << " ";
    }
    std::cout << '\n';
}
```

<a href="https://godbolt.org/z/7xWjvhx5e" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

We get (the last line is my manual annotation):

```
b1 in hex is: e8 20 40 00 00 00 00 00 07 00 00 00 00 00 00 00 
b2 in hex is: e8 20 40 00 00 00 00 00 ff ff ff ff 00 00 00 00 
//           |------- 8 bytes -------|-baseField-|- 4 bytes -|
```

Where we note that the first pair of hex values is the first byte in the struct. We can tell from this output that this machine has little-endian byte order, because the first byte for `baseField` shows the `7` stored in `b1`, and the following bytes are used for higher-order bits as shown by the fact that the higher-order bits of `0xffffffff` occupy later byte positions in `b2`.

This means that the first 8 bytes of both `b1` and `b2` are both `0x4020e8`. **This first field is actually the vpointer**, the pointer to `Base`’s vtable. The important thing for you to note here is that if two objects are truly of the same type, they point to the same, single vtable for that type. So our fully revealed memory layout is:


<table>
            <tbody><tr>
                <th colspan="3"><code>class Base</code> memory layout</th>
            </tr>
            <tr>
                <td>vptr to <code>Base</code>’s vtable</td>
                <td><code>int32_t baseField</code></td>
                <td>(padding)</td>
            </tr>
            <tr>
                <td>8 bytes</td>
                <td>4 bytes</td>
                <td>4 bytes</td>
            </tr>
        </tbody></table>


Which also explains `Base`’s alignment — `Base` has an alignment of 8 because its vptr member has an alignment of 8. Let’s check that this is the case for `Derived` as well:

```cpp
int main() {
    // ... as above

    d1.baseField = 7;
    d2.baseField = 0xffffffff;
    d1.derivedField = 7;
    d2.derivedField = 0xffffffffffffffffull;
    char* byteViewD1 = reinterpret_cast<char*>(&d1);
    char* byteViewD2 = reinterpret_cast<char*>(&d2);
    std::cout << "d1 in hex is: ";
    for (size_t i = 0; i < sizeof(d1); ++i) {
        std::cout << std::setfill('0') 
                  << std::setw(2) 
                  << std::hex 
                  << static_cast<int>(byteViewD1[i] & 0xFF) << " ";
    }
    std::cout << '\n';
    std::cout << "d2 in hex is: ";
     for (size_t i = 0; i < sizeof(d2); ++i) {
        std::cout << std::setfill('0') 
                  << std::setw(2) 
                  << std::hex 
                  << static_cast<int>(byteViewD2[i] & 0xFF) << " ";
    }
    std::cout << '\n';
}
```

<a href="https://godbolt.org/z/W84Y7br47" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

Which gives us (again, last line is my manual annotation):

```
d1 in hex is: c8 20 40 00 00 00 00 00 07 00 00 00 00 00 00 00 07 00 00 00 00 00 00 00 
d2 in hex is: c8 20 40 00 00 00 00 00 ff ff ff ff 00 00 00 00 ff ff ff ff ff ff ff ff 
//           |------ vpointer -------| baseField |- padding -|---- derivedField -----|
```

Both vpointers for `d1` and `d2` are the same (the address of `Derived`’s vtable, `0x4020c8`), and most importantly they are different from the vpointers for `b1` and `b2` (the address of `Base`’s vtable, `0x4020e8`). Here’s `Derived`’s memory layout:


<table>
            <tbody><tr>
                <th colspan="4"><code>class Derived</code> memory layout</th>
            </tr>
            <tr>
                <th colspan="3"><code>class Base</code> subobject</th>
                <th colspan="2"><code>class Derived</code> data members
            </th></tr>
            <tr>
                <td>vptr to <code>Derived</code>’s vtable</td>
                <td><code>int32_t baseField</code></td>
                <td>(padding)</td>
                <td><code>uint64_t derivedField</code></td>
            </tr>
            <tr>
                <td>8 bytes</td>
                <td>4 bytes</td>
                <td>4 bytes</td>
                <td>8 bytes</td>
            </tr>
        </tbody></table>


And that’s how C++ implements dynamic dispatch! Upon a call to a `virtual` method through a base reference/pointer, the compiler adds instructions to lookup the address of the derived method implementation in the appropriate vtable through the vptr. The vptr itself is initialized *for you* (automatically, without you writing it in the member initializer list of a constructor) every time you instantiate a class with `virtual` methods. It is initialized to point to the vtable of the <q>true</q> derived class.

> **Costs of dynamic dispatch**:
>
> - Additional storage **per-object** to store the vptr(s)<sup><a href="#footnote47" id="footnoteret47" class="footnoteret">[47]</a></sup>, and
> - Extra runtime computation **per-`virtual` call** to lookup the correct method implementation by looking up into the vtable and dereferencing the function address.
>
> The static storage needed to store the vtables is usually not a concern because there’s only at most one per-type, which is generally very small compared to the amount of object instantiations.

\

> **Note (When do I get a vptr?)**: Your `class`/`struct`’s memory layout automatically gets a vptr (of the same size and alignment as any other pointer) if your type has any virtual methods, or if it has any virtual base classes ([1.6](#sec_1_6)). If you already have one virtual method, the rest come essentially for free (because you’ve already paid the cost for a vptr).

<span id="sec_1_5_6_2"></span>

##### Vtable layout

In the above example ([1.5.6.1](#sec_1_5_6_1)), let’s consider what the compiler knows when we make a virtual method call via a polymorphic base pointer:

```cpp
Base* basePtr = new Derived{};
basePtr->foo();
```

This call to `foo()` goes through the vptr, and then offsets into the vtable according to the choice of method (here, `foo`). For example one simple scheme would be to just offset into the table based on the order of the `virtual` methods in `Base`’s class definition.

But wait! All the compiler knows up until now was that we made a `virtual` call through a pointer to `Base`. How is it supposed to know what the *actual layout* of the vtable being pointed to by the vptr actually is? Well, in reality there are multiple ways to solve this problem, but here’s one sensible and efficient solution:

*Make the vtable layout for derived classes compatible with its base class vtable layout.*

This means that, given that the vtable is for *any descendant class of `Base`*, we could *pretend* it was the same layout as `Base` and still have it work. In other words, the offset for any of the `virtual` methods of `Base` will <u>always</u> be at the same offset for the vtable of `Base` and any of its descendants.

How is this achievable? In practice, `virtual` methods are ordered in a vtable in recursive declaration order. This means that the vtable for a base class has its `virtual` methods ordered as they appear in the class definition top-to-bottom. In a derived class vtable, first the `virtual` methods from the base class appear in the same order as they appear in base, with any overriden function pointers changed. After these entries, the entries for the derived class’s new `virtual` methods are appended.

In other words, all new `virtual` derived methods will always appear after the entries for any base `virtual` entries (whether overriden or not). The result is that even if you have a chain like

```cpp
class A {
public:
    virtual void f() {}
};

class B: public A {
    void f() override {}
    virtual void g() {}
    virtual void h() {}
};

class C: public B {
    void h() override {}
    virtual void phi() {}
};
```

The vtable of `D` can be accessed from a base pointer to any of `A`, `B`, and `C` because all of their `virtual` methods will be located exactly where they would be for their respective vtables. In particular their vtables would look something like:


<table style="margin-left:auto;margin-right:auto;">
                    <tbody><tr>
                        <th colspan="2">(part of) vtable for <code>A</code></th>
                    </tr>
                    <tr>
                        <th>Method</th>
                        <th>Function address</th>
                    </tr>
                    <tr>
                        <td><code>A::f()</code></td>
                        <td>0x555555555196</td>
                    </tr>
                </tbody></table>


\


<table style="margin-left:auto;margin-right:auto;">
                <tbody><tr>
                    <th colspan="2">(part of) vtable for <code>B</code></th>
                </tr>
                <tr>
                    <th>Method</th>
                    <th>Function address</th>
                </tr>
                <tr>
                    <td><code>B::f()</code></td>
                    <td>0x5555555551a6</td>
                </tr>
                <tr>
                    <td><code>B::g()</code></td>
                    <td>0x5555555551b6</td>
                </tr>
                <tr>
                    <td><code>B::h()</code></td>
                    <td>0x5555555551c6</td>
                </tr>
            </tbody></table>


\


<table style="margin-left:auto;margin-right:auto;">
                <tbody><tr>
                    <th colspan="2">(part of) vtable for <code>C</code></th>
                </tr>
                <tr>
                    <th>Method</th>
                    <th>Function address</th>
                </tr>
                <tr>
                    <td><code>B::f()</code></td>
                    <td>0x5555555551a6</td>
                </tr>
                <tr>
                    <td><code>B::g()</code></td>
                    <td>0x5555555551b6</td>
                </tr>
                <tr>
                    <td><code>C::h()</code></td>
                    <td>0x5555555551d6</td>
                </tr>
                <tr>
                    <td><code>C::phi()</code></td>
                    <td>0x5555555551e6</td>
                </tr>
            </tbody></table>


Notice that, for example, `h` is the third entry for both the vtables of `B` and `C`.

<span id="sec_1_5_6_3"></span>

##### Multiple inheritance

Let’s consider vtable layout ([1.5.6.2](#sec_1_5_6_2)) with respect to an inheritance hierarchy like this:

```cpp
class A {
public:
    virtual void f() {}
    
    uint32_t fieldA;
};

class B {
public:
    virtual void g() {}

    uint16_t fieldB;
};

class C: public A, public B {
public:
    void f() override {}
    virtual void h() {}

    uint64_t fieldC;
};
```

where `C` inherits from multiple classes (*multiple inheritance*). Here’s a UML diagram:

![Multiple inheritance class diagram](/static/img/multiple-inheritance.svg)

From what we’ve learned so far, we know that `C` will contain:

- An `A` subobject (containing a `uint32_t` field)
- A `B` subobject (containing a `uint16_t` field)
- A `uint64_t` field
- Somewhere in the above, a vptr to the vtable of `C`.

Where *is* the vptr? Well, for one thing we know that `A`’s layout itself must contain a vptr, because it has `virtual` methods. At the same time, `B` also contains `virtual` methods, so by itself, it also has a vptr. So, if we do either of the following casts:

```cpp
C c{};
// static_casts are okay because we are 100% sure that A and B *are* bases of C.
A* aBasePtr = static_cast<A*>(&c);
B* bBasePtr = static_cast<B*>(&c);
```

both base pointers don’t know that they actually point to/inside a `C`, they only know that they point to `A`/`B` respectively, and can independently access vptrs because `A` and `B` each have a vptr. **So there must be at least 2 vptrs in `C`**.

From this alone we can make a pretty good guess about what `C` should look like in terms of memory layout. It ought to look something like:


<table>
            <tbody><tr>
                <th colspan="7"><code>class C</code> memory layout</th>
            </tr>
            <tr>
                <th colspan="3"><code>class A</code> subobject</th>
                <th colspan="3"><code>class B</code> subobject</th>
                <th colspan="1"><code>class C</code> data members
            </th></tr>
            <tr>
                <td>vptr corresponding to <code>C</code>-as-an-<code>A</code></td>
                <td><code>uint32_t fieldA</code></td>
                <td>(padding)</td>
                <td>vptr corresponding to <code>C</code>-as-a-<code>B</code></td>
                <td><code>uint16_t fieldB</code></td>
                <td>(padding)</td>
                <td><code>uint64_t fieldC</code></td>
            </tr>
            <tr>
                <td>8 bytes</td>
                <td>4 bytes</td>
                <td>4 bytes</td>
                <td>8 bytes</td>
                <td>2 bytes</td>
                <td>6 bytes</td>
                <td>8 bytes</td>
            </tr>
        </tbody></table>


So, `C` should occupy 40 bytes and have an alignment of 8. Here’s some code to verify our guess:

```cpp
int main() {
    C c{};

    std::cout << "sizeof C: " << sizeof(c) 
              << ", alignof C: " << alignof(c) << '\n';
    // location of C
    std::cout << "location of C:\t\t\t" << &c << std::endl; 
    // location of A subobject in C:
    std::cout << "location of A subobject:\t" << static_cast<A*>(&c) << '\n';
    // location of fieldA
    std::cout << "location of fieldA:\t\t" << &c.fieldA << '\n';
    // location of B subobject in C:
    std::cout << "location of B subobject:\t" << static_cast<B*>(&c) << '\n';
    // location of fieldB
    std::cout << "location of fieldB:\t\t" << &c.fieldB << '\n';
    // location of fieldC
    std::cout << "location of fieldC:\t\t" << &c.fieldC << '\n';
}
```

<a href="https://godbolt.org/z/rzEPhaf7e" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

I get the output (I manually annotated the offsets):

```
sizeof C: 40, alignof C: 8
location of C:          0x7fff75489760 (offset: 0 bytes)
location of A subobject:    0x7fff75489760 (offset: 0 bytes)
location of fieldA:     0x7fff75489768 (offset: 8 bytes)
location of B subobject:    0x7fff75489770 (offset: 16 bytes)
location of fieldB:     0x7fff75489778 (offset: 24 bytes)
location of fieldC:     0x7fff75489780 (offset: 32 bytes)
```

which agrees with our above guess. There’s a couple of points of interest here:

- **Pointer adjustment:** Notice that the `static_cast<B*>(&c)` resulted in a <u>different address</u> than `&c`. This is pointer adjustment, and one main difference between `static_cast` and `reinterpret_cast`. If you used `reinterpret_cast<B*>(&c)` here, it would have given you a pointer to the beginning of `C` *as if a `B` subobject lived there*.

  Whenever you either `static_cast` or `dynamic_cast` from a pointer to a derived class to a pointer to a base class (or vice-versa), these casts will offset the resulting address to point to the correct subobject (enclosing object respectively), as if the pointer really was just pointing at the desired type without knowledge of any surrounding context.

- **What should the vtables store?**: In the above examples, our compiler (g++ 15.2) has used the convention of storing the vptr as the first entry of the object<sup><a href="#footnote48" id="footnoteret48" class="footnoteret">[48]</a></sup>. **This condition needs to apply recursively to all subobjects**<sup><a href="#footnote49" id="footnoteret49" class="footnoteret">[49]</a></sup>. Thus, we have three conditions/constraints to handle:

  1.  The first entry of a `C` needs to be a vptr which points to a vtable which can at the very least locate `C`’s new virtual methods not inherited from either `A` or `B`.
  2.  The first entry of an `A` subobject of `C` needs to be a vptr which points to a vtable layout-compatible with `A`’s vtable. This vtable needs to be able to locate `C`’s inherited and overriding implementations for `A`’s methods.
  3.  The first entry of an `B` subobject of `C` needs to be a vptr which points to a vtable layout-compatible with `B`’s vtable. This vtable needs to be able to locate `C`’s inherited and overriding implementations for `B`’s methods.

  Here’s a simple idea. Allocate `C` like `(C's vptr, A subobject, B subobject, C's members)`, and just have 3 separate vtables. This solves the problem, but `C` now has 3 vptrs, which is 24 bytes for vptrs alone. Clearly unideal.

  We know that we need at least 2 vptrs, and in fact, we can obtain this optimum by taking advantage of compatible vtable layouts as we covered above in [1.5.6.2](#sec_1_5_6_2). Here’s the idea: merge `C`’s vptr with the `A` subobject’s vptr by appending `C`’s new (and overriding) `virtual` methods to the end of the vtable representing `C`-as-an-`A`. The resulting vtable is layout-compatible with `A`’s vtable. We can thus safely upcast from `C*` to `A*` without a pointer adjustment.

  We still can’t avoid giving the `B` subobject its own vtable though, because of pointer adjustment — upcasting like `static_cast<B*>(cPtr)` points into a new offset into `C`, where we expect to be pointing to a `B` object which begins with a vptr. Furthermore, even if we did not need to do a pointer adjustment, the layout of the first vtable (representing `C`-as-an-`A` and `C`’s new methods) cannot in general be layout-compatible with `B`’s vtable layout. Here’s what our vtables look like:

  
<table style="margin-left:auto;margin-right:auto;">
                        <tbody><tr>
                            <th colspan="3">(part of) vtable for <code>C</code>-as-an-<code>A</code> <i>and</i>
                            <code>C</code></th>
                        </tr>
                        <tr>
                            <th>Method</th>
                            <th>Function address</th>
                            <th>Notes</th>
                        </tr>
                        <tr>
                            <td><code>C::f()</code></td>
                            <td>0x55555555523e</td>
                            <td>Overriding <code>A::f()</code>. Comes first for layout-compatibility 
                                with <code>A</code>’s vtable.
                            </td>
                        </tr>
                        <tr>
                            <td><code>C::h()</code></td>
                            <td>0x55555555524e</td>
                            <td><code>C</code>’s new <code>virtual</code> methods are appended after <code>C</code>-as-an-<code>A</code></td>
                        </tr>
                    </tbody></table>


  \

  
<table style="margin-left:auto;margin-right:auto;">
                        <tbody><tr>
                            <th colspan="3">(part of) vtable for <code>C</code>-as-a-<code>B</code></th>
                        </tr>
                        <tr>
                            <th>Method</th>
                            <th>Function address</th>
                            <th>Notes</th>
                        </tr>
                        <tr>
                            <td><code>B::g()</code></td>
                            <td>0x55555555522e</td>
                            <td>Directly inherited from <code>B</code>. 
                            </td>
                        </tr>
                    </tbody></table>


  Where the vptr in the `A` subobject points to the first vtable, and the vptr in the `B` subobject points to the second.

<span id="sec_1_5_6_3_1"></span>

###### Thunks

That was *almost* the full picture, but now consider one more thing. What if `C` overrides a `virtual` method in one of its non-first bases (`B`)? Consider (just look at commented lines):

```cpp
class A {
public:
    virtual void f() {}
    
    uint32_t fieldA;
};

class B {
public:
    virtual void g() {}

    uint16_t fieldB;
};

class C: public A, public B {
public:
    void g() override {                    // <--- Instead of overriding A::f, we override B::g.
        std::cout << this->fieldC << '\n'; // <--- access C's member.
    } 
    virtual void h() {}

    uint64_t fieldC;
};
```

You can easily imagine for yourself that the entry for `f()` in the first vtable now points to `A::f()` and the entry for `g()` now points to `C::g()` in the second. Okay, now let’s consider what happens when we call `g()` through a base reference/pointer to `B`:

```cpp
C c{};
B* bPtr = &c; // implicitly upcasts, requiring pointer adjustment.
bPtr->g();    // what is the value of 'this' implicitly passed to g()?
```

When you call a method on an object of class-type, the address of the object is implicitly passed as the `this` parameter to the method. In this case, `C::g` (which is found via the vtable lookup) needs to use `this` in order to offset into the object to find `fieldC`<sup><a href="#footnote50" id="footnoteret50" class="footnoteret">[50]</a></sup>. But wait, `bPtr` has no idea that it’s actually pointing *inside* a `C`, so you actually passed an offsetted pointer to `B` as `this` to `C::g`! `C::g` is expecting a pointer to `C` as `this`. How can we achieve this? Remember our core constraints:

- Each base subobject must have its own vptr & vtable (where the first base vptr can coincide with the derived type’s vptr by merging vtables).
- Vtables corresponding to each <q>derived-as-a-base</q> must be layout-compatible with the vtable layout of the base type.
- (Now) virtual calls to overriden methods from non-first base classes must have their `this` pointer fixed back to point to the derived type implementing the override.

Here’s a solution that is commonly implemented and which satisfies these requirements:

- In vtables corresponding to non-first bases, entries corresponding to overriden methods actually point to **thunks**: small pieces of code which first adjust the `this` pointer, and then call the actual `virtual` method.
- The actual `virtual` method is appended to the primary vtable (corresponding to the first base and the derived class itself), maintaining layout-compatibility with the first base vtable.

Now we are ready to see the full vtable layouts. Here, the <q>Method</q> column has been renamed <q>Entry</q> and <q>Function address</q> has been renamed <q>Value</q> to account for non-function-pointer entries:


<table style="margin-left:auto;margin-right:auto;">
                <tbody><tr>
                    <th colspan="3">vtable for <code>C</code>-as-an-<code>A</code> <i>and</i>
                    <code>C</code></th>
                </tr>
                <tr>
                    <th>Entry</th>
                    <th>Value</th>
                    <th>Notes</th>
                </tr>
                <tr>
                    <td><code>top_offset</code></td>
                    <td>0</td>
                    <td>
                        <code>top_offset</code> is the amount we should offset <code>this</code> 
                        to make a <code>virtual</code> call to thunks in this table.
                    </td>
                </tr>
                <tr>
                    <td><code>typeinfo for C</code></td>
                    <td>0x555555557d48</td>
                    <td>A pointer to typeinfo records for usage by RTTI facilities as covered in <a href="#sec_1_5_5">1.5.5</a>.</td>
                </tr>
                <tr>
                    <td>
                        <code>A::f()</code>
                    </td>
                    <td>0x55555555525e</td>
                    <td>Inherited from <code>A</code>.</td>
                </tr>
                <tr>
                    <td>
                        <code>C::g()</code>
                    </td>
                    <td>0x55555555527e</td>
                    <td>True implementation of <code>C::g()</code>, overriding <code>B::g()</code>.</td>
                </tr>
                <tr>
                    <td>
                        <code>C::h()</code>
                    </td>
                    <td>0x5555555552c2</td>
                    <td>New <code>virtual</code> method in <code>C</code>.</td>
                </tr>
            </tbody></table>


\


<table style="margin-left:auto;margin-right:auto;">
                <tbody><tr>
                    <th colspan="3">vtable for <code>C</code>-as-a-<code>B</code></th>
                </tr>
                <tr>
                    <th>Entry</th>
                    <th>Value</th>
                    <th>Notes</th>
                </tr>
                <tr>
                    <td><code>top_offset</code></td>
                    <td>-16</td>
                    <td>
                        <code>top_offset</code> is the amount we should offset <code>this</code> 
                        to make a <code>virtual</code> call to thunks in this table.<sup><a id="footnoteret51" href="#footnote51" class="footnoteret">[51]</a></sup>
                    </td>
                </tr>
                <tr>
                    <td><code>typeinfo for C</code></td>
                    <td>0x555555557d48</td>
                    <td>A pointer to typeinfo records for usage by RTTI facilities as covered in <a href="#sec_1_5_5">1.5.5</a>.</td>
                </tr>
                <tr>
                    <td>
                        <b>thunk to</b> <code>C::g()</code>
                    </td>
                    <td>0x5555555552b8</td>
                    <td>In the spot that <code>B</code>’s vtable layout would expect <code>C::g()</code> for 
                        layout compatibility. First adjusts <code>this</code> by <code>top_offset</code>, 
                        then jumps to the actual function pointer for <code>C::g</code> 
                        stored in <code>C</code>’s main vtable.
                    </td>
                </tr>
            </tbody></table>


<span id="sec_1_6"></span>

### Virtual inheritance

Virtual inheritance is a feature of C++ that is dedicated towards solving the problem that arises when you derive from multiple classes which all share a common base class. This problem is exemplified in its simplest form by the diamond problem.

<span id="sec_1_6_1"></span>

#### The diamond problem

Let’s consider the multiple inheritance problem again, but this time with a twist:

```cpp
class A {
public:
    virtual void f() {}

    uint32_t aMember;
};

class B: public A {
public:
    virtual void g() {}

    uint64_t bMember;
};

class C: public A {
public:
    virtual void h() {}

    uint16_t cMember;
};

class D: public B, public C {
public:
    void confusion() {
        std::cout << "My aMember is: " << aMember << std::endl;
    }
    
    uint32_t dMember;
};
```

This is the multiple inheritance setting again, but this time, `A` is a base of more than one of `D`’s bases. What should `D{}.confusion()` do? In particular, does `aMember` refer to the `aMember` that was inherited through `B`, or the one inherited through `C`?

It turns out, this ambiguity prevents the program from even compiling.

<a href="https://godbolt.org/z/a1raq9T3G" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

I get the message:

```
<source>:29:58: error: non-static member 'aMember' found in multiple base-class subobjects of type 'A':
    class D -> B -> A
    class D -> C -> A
   29 |     void confusion() { std::cout << "My aMember is: " << aMember << std::endl; }
      |                                                          ^
<source>:10:14: note: member found by ambiguous name lookup
   10 |     uint32_t aMember;
      |              ^
```

To <q>fix</q> this problem, you can specify which `aMember` you want by explicitly casting to a specific base like:

```cpp
D d{};            
std::cout << "B's aMember is " << static_cast<B*>(&d)->aMember << '\n';
```

<a href="https://godbolt.org/z/z33eaPKG3" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

But really this ambiguity is a symptom of a larger problem. Usually, this problem happens when you want to inherit from two parents, and these parents both model different aspects of the *same* grandparent. In other words, you want `B` and `C` to inherit from *the same* `A`. For that reason, this setting is called the *diamond problem*, because the desired inheritance hierarchy looks like a diamond:

![Diamond inheritance class diagram](/static/img/diamond-inheritance.svg)

The solution to the diamond problem is to have `B` and `C` *virtually inherit* from `A` like `class B: virtual public A`:

```cpp
class A {
public:
    virtual void f() {}

    uint32_t aMember;
};

class B: virtual public A { // <-- virtual inheritance!
public:
    virtual void g() {}

    uint64_t bMember;
};

class C: virtual public A { // <-- virtual inheritance!
public:
    virtual void h() {}

    uint16_t cMember;
};

class D: public B, public C {
public:
    void confusion() {
        std::cout << "My aMember is: " << aMember << std::endl;
    }
    
    uint32_t dMember;
};
```

*Note: adding `virtual` as part of the inheritance clause is independent of the access specifier. You can reverse their order too (like `protected virtual`).*

In short, when there are base classes which are virtually inherited <u>anywhere</u> in your derived class’s inheritance hierarchy, <u>all copies of the same virtually inherited class are treated as the same copy</u>. In terms of dependency order, virtually inherited bases are initialized before all <q>regular</q> bases.

What consequences are there to supporting virtual bases from a design and implementation perspective? We’ll focus on the consequences on:

- initialization and destruction order,
- implicitly-defined special member functions, and
- vtables.

<span id="sec_1_6_2"></span>

#### The full picture: initialization/destruction order

How would you design virtual inheritance as a language feature? In particular, we want to support the following idea:

*If a class `Descendant` has any ancestors which virtually inherit from `VirtualAncestor`, only one copy of `VirtualAncestor` should exist as a base subobject in `Descendant` instances corresponding to all virtually inherited `VirtualAncestor`s.*

One key point to notice here is that `VirtualAncestor` needs to have been initialized before any of its ancestors which virtually inherit from it are initialized, in the initialization of `Descendant`.

In that case, *who* should initialize `VirtualAncestor`? If multiple bases virtually inherit from it, should one of the base classes initialize it? If so, which one? Consider the following code:

```cpp
class VirtualAncestor { 
public:
    VirtualAncestor(int val) : ancestorMember{val} {}

    int ancestorMember;
};

class Father: virtual public VirtualAncestor {
public:
    Father(): VirtualAncestor(0) {} // should this initialization of VirtualAncestor happen?
};

class Mother: virtual public VirtualAncestor {
public:
    Mother(): VirtualAncestor(1) {} // or should this initialization of VirtualAncestor happen?
};

class Child: public Father, public Mother {
public:
    Child(): VirtualAncestor(2) {} // what should ancestorMember store?
};
```

Should `Child().ancestorMember` be `0`, `1`, or `2`? It’s true that you can always write a well-defined rule for which initialization takes precedence. But for anyone reading the code, it would mean having to go through the entire inheritance hierarchy and applying the rule to figure it out. We need a simple solution that doesn’t involve going through the entire inheritance hierarchy.

For this reason, <u>the *most-derived class*, i.e., the actual derived type of the object being constructed, and nobody else, is responsible for constructing all virtual bases</u>. The above code gives you `Child().ancestorMember == 2`, because only `Child`’s initialization of `VirtualAncestor` is considered. In fact, if you remove `VirtualAncestor`’s constructor call from `Child`’s member initializer list, the code doesn’t even compile <a href="https://godbolt.org/z/K5Ez684nj" target="_blank" rel="noopener noreferrer">(Run it yourself)</a>! Instead, the compiler assumes that since `Child` did not specify it in the member initialization list, `VirtualAncestor` should be default-constructible, but no such constructor exists:

```
<source>: In constructor 'Child::Child()':
<source>:25:13: error: no matching function for call to 'VirtualAncestor::VirtualAncestor()'
   25 |     Child() {} // what should ancestorMember store?
      |             ^
  â€¢ there are 3 candidates
    â€¢ candidate 1: 'VirtualAncestor::VirtualAncestor(int)'
      <source>:8:5:
          8 |     VirtualAncestor(int val) : ancestorMember{val} {}
            |     ^~~~~~~~~~~~~~~
      â€¢ candidate expects 1 argument, 0 provided
    â€¢ candidate 2: 'constexpr VirtualAncestor::VirtualAncestor(const VirtualAncestor&)'
      <source>:6:7:
          6 | class VirtualAncestor {
            |       ^~~~~~~~~~~~~~~
      â€¢ candidate expects 1 argument, 0 provided
    â€¢ candidate 3: 'constexpr VirtualAncestor::VirtualAncestor(VirtualAncestor&&)'
      â€¢ candidate expects 1 argument, 0 provided
```

> **Note:** When a derived class virtually inherits from a base, the derived class <u>and all of its descendants</u> will by default initialize the virtual base with a call to its default constructor. If the virtual base has no default constructors, <u>the derived class and all of its descendants must explicitly initialize the virtual base in their member initializer lists</u>. Otherwise, your program will not compile.

In section [1.4.7](#sec_1_4_7), we described an initialization order and called it <q>simplified</q>. The reason is that it did not account for virtual inheritance. Here’s the full picture (we only added one point to the beginning):

> **Initialization order (complete).** When a class with no virtual bases is instantiated, its fields and bases are initialized in the following order:
>
> 1.  **First, <u>if the type is the most-derived class in the initialization of the main object</u>, all virtual bases are initialized in depth-first left-to-right (referring to order in the list of bases) post-order traversal order.**
> 2.  Then, all direct bases are initialized in left-to-right order as they appear in the list of bases.
> 3.  Then, non-static data members are initialized in the order (top-to-bottom) they appear in the class definition.
> 4.  Finally, the body of the constructor is executed.

In case you need a reminder of what <q>depth-first post-order traversal order</q> means, you <q>visit</q> a node in the tree after you visit all of its subtrees. Here’s an example:

```cpp
class VAncestorAlpha {
public:
    VAncestorAlpha() {
        std::cout << "VAncestorAlpha initialized!\n";
    }
};

class Beta: public virtual VAncestorAlpha {
public:
    Beta() {
        std::cout << "Beta initialized!\n";
    }
};

class VAncestorBeta: public Beta {
public:
    VAncestorBeta() {
        std::cout << "VAncestorBeta initialized!\n";
    }
};

class VAncestorA {
public:
    VAncestorA() {
        std::cout << "VAncestorA initialized!\n";
    }
};

class VAncestorB: virtual public VAncestorBeta {
public:
    VAncestorB() {
        std::cout << "VAncestorB initialized!\n";
    }
};

class VAncestorC {
public:
    VAncestorC() {
        std::cout << "VAncestorC initialized!\n";
    }
};

class A: virtual public VAncestorA {
public:
    A() {
        std::cout << "A initialized!\n";
    }
};

class B: virtual public VAncestorB, virtual public VAncestorA {
public:
    B() {
        std::cout << "B initialized!\n";
    }
};

class C: public A, public B, virtual public VAncestorB, virtual public VAncestorC {
public:
    C() {
        std::cout << "C initialized!\n";
    }
};

int main() {
    C c;
}
```

Which prints

```
VAncestorA initialized!
VAncestorAlpha initialized!
Beta initialized!
VAncestorBeta initialized!
VAncestorB initialized!
VAncestorC initialized!
A initialized!
B initialized!
C initialized!
```

<a href="https://godbolt.org/z/8zrP83WdT" target="_blank" rel="noopener noreferrer">Run it yourself!</a>

Here’s the explanation:

- `C` needs to be initialized, but it is the most-derived class type. Hence, first its `virtual` bases are initialized. We perform post-order traversal on the inheritance hierarchy of `C`:
  - Recurse into `A`.
    - Recurse into `VAncestorA`. This is virtually inherited, and has no bases. So this is the **first initialized virtual base**.

    Since `A` was not a virtual base and we have visited all of its bases, we are done with it for the time being.
  - Recurse into `B`.
    - Recurse into `VAncestorB`. This is virtually inherited, but it has a base. Since this is post-order traversal, we must visit its bases first.
      - Recurse into `VAncestorBeta`. This is virtually inherited, but it has a base.
        - Recurse into `Beta`. This is (normally) inherited, but it has a base.
          - Recurse into `VAncestorAlpha`. It is virtually inherited and has no bases. So it is the **second initialized virtual base**.

          `Beta` was not a virtual base and we have visited all of its bases, so we do nothing here. In particular, it is **not initialized here**.

        Now that all of its bases have been traversed, since `VAncestorBeta` was virtually inherited, it can be initialized here. To initialize it we follow the regular initialization order and initialize its (normally) inherited `Beta` subobject first. Then, `VAncestorBeta` is constructed as the **third initialized virtual base**.

      We have visited all the bases of `VAncestorB`. It is the **fourth initialized virtual base**.
    - Recurse into `VAncestorA`. It is a virtual base which was already initialized (first) (through `A`), so we do nothing here.

    `B` was not a virtual base and we have visited all of its bases, so we are done with it for now.
  - Recurse into `VAncestorB`. It is a virtual base which was already initialized (fourth) (through `B`), so we do nothing here.
  - Recurse into `VAncestorC`. This is virtually inherited, has no bases, and hasn’t been seen before. So this is the **fifth (and last) initialized virtual base**.
- We have finished the initialization of virtual base classes. Following regular recursive base initialization order, `A` is initialized, and then `B` is initialized as direct base subobjects of `C`.
- We have finished initialization of direct base classes. `C` is initialized, and we are done.

Now that we understand initialization order, we can look at the full picture of the destruction order. It’s just the exact reverse of the new initialization order (we only added one point to the end).

> **Destruction order (complete).** When an instantiation of a class with no virtual bases is destructed, its fields and bases are destructed in the following order:
>
> - First, the body of the destructor is executed.
> - Then, all non-static data members are destructed in the <u>reverse</u> (bottom-to-top) of the order they appear in the class definition.
> - Then, all direct base subobjects are destructed in right-to-left order, i.e., the <u>reverse</u> of the order they appear in the list of bases.
> - **Finally, <u>if this is the most-derived class of the main object being destructed</u>, all virtual bases are destructed in the reverse of depth-first left-to-right post-order traversal<sup><a href="#footnote52" id="footnoteret52" class="footnoteret">[52]</a></sup>.**

Note that we don’t need to revisit any of the implicitly-defined special methods. Our original descriptions are correct once you account for the complete initialization and destruction orders.

<span id="sec_1_6_3"></span>

#### Memory layout of virtually derived classes

Virtually inherited classes are, in a sense, the most-upstream dependencies of our inheritance hierarchy. This is because they are constructed first before all of the non-virtual bases are constructed in order to prevent duplication and so that the non-virtual bases know where to find them.

Unlike the pattern we’ve seen so far with regular inheritance, virtual base subobjects are placed at the bottom of the memory layout (higher memory addresses). Consider for example the following code:

```cpp
class A {
public:
    int32_t aMember;
};

class B {
public:
    virtual void bMethod() {}
    int32_t bMember;
};

class C: virtual public A, virtual public B {
public:
    int64_t cMember;
};

class D: virtual public A, virtual public B {
public:
    int16_t dMember;
};

class E: public C, public D {
public:
    int16_t eMember;
};
```

Here’s the memory layout of `E`:


<table>
            <tbody><tr>
                <th colspan="9"><code>class E</code> memory layout</th>
            </tr>
            <tr>
                <td>vptr for <code>E</code>-as-a-<code>C</code> (merged with <code>E</code>’s vptr)</td>
                <td><code>int64_t cMember</code></td>
                <td>vptr for <code>E</code>-as-a-<code>D</code></td>
                <td><code>int16_t dMember</code></td>
                <td><code>int16_t eMember</code></td>
                <td><code>int32_t aMember</code></td>
                <td>vptr for <code>E</code>-as-a-<code>B</code></td>
                <td><code>int32_t bMember</code></td>
                <td>(padding)</td>
            </tr>
            <tr>
                <td>8 bytes</td>
                <td>8 bytes</td>
                <td>8 bytes</td>
                <td>2 bytes</td>
                <td>2 bytes</td>
                <td>4 bytes</td>
                <td>8 bytes</td>
                <td>4 bytes</td>
                <td>4 bytes</td>
            </tr>
        </tbody></table>


<span id="sec_1_6_4"></span>

#### Virtual table tables (VTT)

<span id="sec_1_7"></span>

### Object-Oriented design principles

<span id="sec_1_7_1"></span>

#### SOLID

SOLID is an acronym for five principles to guide the design of object-oriented programs. In fact, we’ve already seen and used most of them when we discussed the motivating problem ([1.2](#sec_1_2)), and how OOP solves it. SOLID stands for:

- **S**ingle responsibility principle
- **O**pen-closed principle
- **L**iskov substitution principle
- **I**nterface segregation principle
- **D**ependency inversion principle

<span id="sec_1_7_1_1"></span>

##### Single responsibility principle

**<q>There should never be more than one reason for a class to change.</q>**

In other words, each class should be responsible for one thing only.

<span id="sec_1_7_1_2"></span>

##### Open-closed principle

**<q>Software entities (classes, modules, functions, etc.) should be open for extension, but closed for modification.</q>**

<span id="sec_1_7_1_3"></span>

##### Liskov substitution principle

**<q>Functions that use pointers or references to base classes must be able to use objects of derived classes without knowing it. </q>**

<span id="sec_1_7_1_4"></span>

##### Interface segregation principle

**<q>Clients should not be forced to depend upon interfaces that they do not use.</q>**

<span id="sec_1_7_1_5"></span>

##### Dependency inversion principle

**<q>High level modules should not depend upon low level modules. Both should depend upon abstractions.</q>**

*and*

**<q>Abstractions should not depend upon details. Details should depend upon abstractions.</q>**

<span id="sec_1_7_2"></span>

#### Composition over inheritance

<span id="sec_1_7_3"></span>

#### Dependency injection

<span id="sec_1_8"></span>

### Design Patterns

<span id="sec_2"></span>

## Appendix

<span id="sec_2_1"></span>

### Initialization in C++

<span id="sec_2_2"></span>

### POD types

<span id="sec_2_2_1"></span>

#### Trivial classes

<span id="sec_2_2_2"></span>

#### Standard layout classes

<span id="sec_2_3"></span>

### Empty base optimization

<span id="sec_2_4"></span>

## Footnotes

1.  <span id="footnote1">This is one of the core selling points of OOP. [↩](#footnoteret1)</span>

2.  <span id="footnote2">The return type, however, cannot be used to resolve overloaded functions. [↩](#footnoteret2)</span>

3.  <span id="footnote3">In this case, this pattern is essentially a tagged union. [↩](#footnoteret3)</span>

4.  <span id="footnote4">We will see that this violates the *dependency inversion principle*. [↩](#footnoteret4)</span>

5.  <span id="footnote5">We will see that this is a violation of the *open-closed principle*. [↩](#footnoteret5)</span>

6.  <span id="footnote6">There’s nothing stopping you from declaring the friendship twice — once for each direction! [↩](#footnoteret6)</span>

7.  <span id="footnote7">This might seem counterintuitive because subclasses are usually larger (implementation-wise) than their superclasses. However, this wording works because the set of all objects satisfying the subtype’s method interface must be smaller than (a subset of) the set of all objects satisfying the superclass’s interface. [↩](#footnoteret7)</span>

8.  <span id="footnote8">i.e., an abstraction. [↩](#footnoteret8)</span>

9.  <span id="footnote9">Since $B$ is <q>based on</q> $A$. [↩](#footnoteret9)</span>

10. <span id="footnote10">In type theory, the data component of `struct`s and `class`es are (cartesian) product types of the composed field types. In relational algebra, the act of filtering dimensions on a dataset is called a *projection*, which gives a geometric interpretation to this act of abstraction. [↩](#footnoteret10)</span>

11. <span id="footnote11">The idea of extending `struct`s of data by adding more fields is called *width subtyping*. There also exists an orthogonal mechanism, *depth subtyping*, which involves replacing fields with subtypes of the original field types. This is not as natural in C++, and thus is out of scope for us. [↩](#footnoteret11)</span>

12. <span id="footnote12">We will see in section [1.5.6.1](#sec_1_5_6_1) that auxiliary fields may also be added to enable runtime polymorphism. [↩](#footnoteret12)</span>

13. <span id="footnote13">See section [1.4.4](#sec_1_4_4). [↩](#footnoteret13)</span>

14. <span id="footnote14">As we will discuss in section [1.4.5](#sec_1_4_5), the constructors, destructor, and assignment operators are excluded from this inherited interface. [↩](#footnoteret14)</span>

15. <span id="footnote15">With any access specifier, regardless of `public`, `private`, or `protected`. [↩](#footnoteret15)</span>

16. <span id="footnote16">except for some special ones, see [1.4.5](#sec_1_4_5) below [↩](#footnoteret16)</span>

17. <span id="footnote17">In general, this is not behaviour you want, because it becomes harder to infer what a name signifies. [↩](#footnoteret17)</span>

18. <span id="footnote18">`override` forces the compiler to check that the derived method truly overrides a `virtual` method with the exact same signature + return type (unless covariant) in a base class (and errors otherwise). [↩](#footnoteret18)</span>

19. <span id="footnote19">This property of a type is called being *trivially copyable*. [↩](#footnoteret19)</span>

20. <span id="footnote20">This property of a type is called being *standard layout*. [↩](#footnoteret20)</span>

21. <span id="footnote21">Not to be confused with subtypes/subclasses! Here the <q>sub</q>object accentuates that the base class is smaller in memory size and hence embedded in the derived object. [↩](#footnoteret21)</span>

22. <span id="footnote22">Including `private` members. [↩](#footnoteret22)</span>

23. <span id="footnote23">This just means inheriting from more than one class. [↩](#footnoteret23)</span>

24. <span id="footnote24">The C++ standard does not actually guarantee, for example, that `A` precedes `B` in memory layout. See point 5 in section 11.7 of the [C++ 20 draft](https://isocpp.org/files/papers/N4860.pdf): *<q>The order in which the base class subobjects are allocated in the most derived object (6.7.2) is unspecified.</q>*\
    </span>

    ------------------------------------------------------------------------

    The only guarantee you have here is that these subobjects will exist, and that they will each occupy contiguous subregions of memory. [↩](#footnoteret24)

25. <span id="footnote25">i.e., in the list following the colon in `class A: public B, private C, public D;` [↩](#footnoteret25)</span>

26. <span id="footnote26">*Note:* Why is the default constructor not implicitly declared when you provide *any* constructor? This gives you maximal control as the programmer: if you haven’t declared any constructor, there needs to exist *some* constructor to make it possible to instantiate the type. Otherwise, if you’ve declared at least one constructor, the compiler assumes you want control over how the object is initialized and know what you’re doing. [↩](#footnoteret26)</span>

27. <span id="footnote27">Or if all non-static non-default-constructible members have *default member initializers* ([1.4.7.3](#sec_1_4_7_3)) [↩](#footnoteret27)</span>

28. <span id="footnote28">Yes, it is possible for the parameter to also be marked non-`const`, or also marked `volatile`, and also for the copy constructor to take extra parameters with default arguments. For the purposes of this article, we will be ignoring these cases. [↩](#footnoteret28)</span>

29. <span id="footnote29">Later revised in [1.6.2](#sec_1_6_2). [↩](#footnoteret29)</span>

30. <span id="footnote30">Later revised in [1.6.2](#sec_1_6_2). [↩](#footnoteret30)</span>

31. <div id="footnote31">

    ```
    ```

    [↩](#footnoteret31)

    </div>

32. <span id="footnote32">and virtual ([1.6](#sec_1_6)) [↩](#footnoteret32)</span>

33. <span id="footnote33">Later revised in [1.6.2](#sec_1_6_2). [↩](#footnoteret33)</span>

34. <span id="footnote34">Later revised in [1.6.2](#sec_1_6_2). [↩](#footnoteret34)</span>

35. <span id="footnote35">(Or any fallback that overload resolution can find, such as copy assignment if move assignment is missing) [↩](#footnoteret35)</span>

36. <span id="footnote36">Adapted and extended from [<q>Becoming a Rule of Zero Hero</q> by Glennan Carnie](https://blog.feabhas.com/2015/11/becoming-a-rule-of-zero-hero/). [↩](#footnoteret36)</span>

37. <span id="footnote37">`Base& baseRef = static_cast<Base&>(object)` [↩](#footnoteret37)</span>

38. <span id="footnote38">Pointer adjustment is covered in more detail in [1.5.6.3](#sec_1_5_6_3). [↩](#footnoteret38)</span>

39. <span id="footnote39">As opposed to *static dispatch*, where the method to call is chosen at compile-time. [↩](#footnoteret39)</span>

40. <span id="footnote40">The return type is not part of the method signature, and furthermore, return types may not necessarily be exactly the same if the overriding return type is covariant ([1.5.2.4](#sec_1_5_2_4)). [↩](#footnoteret40)</span>

41. <span id="footnote41">Primitive types have pseudo-destructors which are no-ops. [↩](#footnoteret41)</span>

42. <span id="footnote42">We’ll see soon in [1.5.6.1](#sec_1_5_6_1) that if you have any `virtual` methods or any bases which have `virtual` methods, you automatically pay the cost for a vptr, so adding another virtual method comes essentially for free. [↩](#footnoteret42)</span>

43. <span id="footnote43">This sentence applies to assignment operators too, but the difference is that this is a good idea for destructors, and not assignment operators, as discussed in [1.5.2.1](#sec_1_5_2_1). [↩](#footnoteret43)</span>

44. <span id="footnote44">[Link](http://www.gotw.ca/publications/mill18.htm) [↩](#footnoteret44)</span>

45. <span id="footnote45">Note: call this on your references, not pointers! If you have a pointer, dereference it before the call. [↩](#footnoteret45)</span>

46. <span id="footnote46">read: compiler-dependent. [↩](#footnoteret46)</span>

47. <span id="footnote47">We’ll see a case of multiple vptrs soon! [↩](#footnoteret47)</span>

48. <span id="footnote48">Again, this is not behaviour guaranteed by the C++ standard — your compiler might do things differently, like store vptrs at the end. [↩](#footnoteret48)</span>

49. <span id="footnote49">Otherwise, if you cast to a base subobject and get the adjusted pointer, the compiler no longer knows the context that the base object is enclosed in a larger object! It would be as if a normal base object was missing a vptr. [↩](#footnoteret49)</span>

50. <span id="footnote50">This is always the case, whether or not we explicitly wrote `this->fieldC` or just `fieldC` above. [↩](#footnoteret50)</span>

51. <span id="footnote51">Refer to the table for <q>`class C` memory layout</q> above and consider why you would want to offset a `B*` pointing inside a `C` by -16 bytes to obtain the original `C*`. [↩](#footnoteret51)</span>

52. <span id="footnote52">This is <u>not</u> pre-order traversal! [↩](#footnoteret52)</span>

CMPUT 350 — Advanced Games Programming
