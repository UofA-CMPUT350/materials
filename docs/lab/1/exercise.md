# Lab 1 Exercise

> [!WARNING]
> Due: September 1st 2026, 11:30pm

**Rules:**

- Your programs must compile without warning using `g++ -g -Wall -Wextra -Wconversion -Wsign-conversion -O -std=c++20 main.cpp matrix.cpp`
- Test your programs with different values. For now, the speed of your program is irrelevant. So don’t spend time on optimization
- You must check for the appropriate preconditions/postconditions. Your program shouldn’t crash or have undefined behaviour (hint: use asserts)!
- Your programs must be well-structured and documented. Use ctrl-x t in Emacs to pretty-print it. Marks are assigned to functionality, program appearance, and comments.
- In case your program hangs, use ctrl-c to terminate it.
- Remember that you need to include the appropriate header files. To find out which ones you need for specific functions such as printf, use the man command.
- Submit your solution files `matrix.cpp` on ::thesvg-color:canvas::[Canvas](https://canvas.ualberta.ca/courses/36033/assignments/793208).

## Matrix Implementation Exercise

In this lab, you will implement a Matrix data structure in C++ to represent a 2D matrix using a 1D array in row-major order.

Before you begin implementing the Matrix class, it is necessary to understand how to properly initialize a class’s member variables.

### Background

#### Constructor Initialization: Member Initializer Lists

When defining a constructor for a type, you will will need to assign initial values to its member variables. 
While assigning values inside the constructor body is usually possible, there is a more direct and efficient way to do this in C++: using a member initializer list.

Consider the following guiding questions:

- How can we initialize member variables **before** any code in the constructor body runs?
- How can we ensure that all members have valid initial values?
- What happens if a member is const or a reference — can it be assigned later?

To address these concerns, C++ provides a member initializer list syntax, which is evaluated before the constructor body. This technique is especially important when initializing:

- const members and references (which must be initialized exactly once),
- complex types or resources like dynamically allocated memory,
- and to ensure consistency and clarity of object construction.

**Example:**

Suppose we have the following structure:

```c++
struct Point {
    int x;
    int y;

    Point(int a, int b)
        : x(a), y(b)
    {
        // constructor body
    }
};
```

In this example, `x` and `y` are initialized directly using the arguments `a` and `b`. 
This approach avoids unnecessary default construction or reassignment. The part: `x(a)`, `y(b)` is called the member initializer list.

To learn more, see the official documentation at: [cppreference.com: Member initializer list](https://en.cppreference.com/w/cpp/language/constructor#Member_initializer_list)

### Problem

You are provided with the following <a :href="$withBase('/static/labs/1.zip')" style="font-size: large">::griddy-icons:file-download::<strong>starter files</strong></a>:

- `matrix.h` — the header file declaring the Matrix struct and its associated methods.
- `matrix.cpp` — an incomplete implementation file that you will complete.
- `main.cpp` — a sample driver to help you test your implementation.

Your goal is to complete `matrix.cpp` by implementing all the functions declared in `matrix.h` (Do not modify `matrix.h`), 
and test your Matrix in `main.cpp`. You should use dynamic memory allocation (`new[]` and `delete[]`) to manage the 1D array backing the matrix.

### Compiling and Testing

Compile your program using the following command:

```shell:no-line-numbers
g++ -g -Wall -Wextra -Wconversion -Wsign-conversion -O -std=c++20 matrix.cpp main.cpp
```

Before submitting, make sure your implementation does not leak memory. Use valgrind to verify:

```shell:no-line-numbers
valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes --verbose ./a.out
```
