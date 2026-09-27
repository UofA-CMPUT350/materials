# Lab 5 Prep Problems

Author: Nathan Sturtevant

> [!WARNING]
> Due: September 29th 2026, 2:00pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-5-prep"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Background

Before starting this lab, please read the cpp references pages
on [std::function](https://en.cppreference.com/cpp/utility/functional/function) and
this [LearnC++](https://www.learncpp.com/cpp-tutorial/introduction-to-lambdas-anonymous-functions/) reference on lambda
functions.

There is much more information on these pages than you need to understand at this point, but these are useful references
with code examples of how to use lambda functions and `std::function`

## Problems

### Draw an animated circle

In the provided code, draw a circle that repeatedly moves from the left side to the right side of the screen. The
y-location of the circle should be about 1/3 from the top of the screen and the x-location should be defined by the
tween function given the number of elapsed frames. Decide and choose a constant for the number of frames per
animation, and then use this to define the animation time. Then, pass that time into the tween function to get the
circle location, and draw it to the screen.

### Change the tween function

Implement nine different tween (easing) functions that are toggled between when you press the keys `1` to `9`. You
can take these functions from lecture, design them yourself, or use [https://easings.net](https://easings.net). You
can look at the code when you click on a particular function, but you should implement it youself in C++.
When a key is pressed, the code should replace the global `tween` function with a new function written as a lambda
expression.

### Draw the tween function

At the bottom of the window plot the tween function. This plot should have an x-axis and a y-axis that go from $[0, 1]$
defining the bounds. Then, the code should loop from 0 to 1 sampling the tween function and drawing it on the screen.
Example output is shown below. The code should draw the current location of the animation on this curve with a small
circle.
