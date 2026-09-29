# Lab 5 Exercise Problems

Author: Nathan Sturtevant

> [!WARNING]
> Due: September 29nd 2026, 11:30pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-5-exercise"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Background
e
In the lab prep you built a simple demo that performs tween operations between two locations. In this lab, you will
extend that work to build an editor that support cubic Bézier curves. To do this, you can start with your prep solution,
or the sample prep code, although you will need to capture mouse events as follows.

```cpp
if (const auto* mouse = event->getIf<sf::Event::MouseButtonPressed>()) {
    // use mouse->position
    switch (mouse->button) {
        case sf::Mouse::Button::Right:
        case sf::Mouse::Button::Left:
        case sf::Mouse::Button::Middle:
        default: 
		    break;
    }
} else if (const auto* mouse = event->getIf<sf::Event::MouseButtonReleased>()) {
    switch (mouse->button) {
        case sf::Mouse::Button::Right:
        case sf::Mouse::Button::Left:
        case sf::Mouse::Button::Middle:
        default: 
		    break;
    }
} else if (const auto* mouse = event->getIf<sf::Event::MouseMoved>()) {
    switch (mouse->button) {
        case sf::Mouse::Button::Right:
        case sf::Mouse::Button::Left:
        case sf::Mouse::Button::Middle:
        default: 
		    break;
    }
}
```

You should use line-drawing code from your project in this lab.

## Problems

### Part 1

Implement a function that gets the location of a point on a cubic Bézier curve (as defined by 4 arbitrary points) at
some time $0 \leq t \leq 1$. Then, update the editor to draw a cubic Bézier curve given the four points. Your editor
should use the following function to sample over different values of `t` and draw lines between the points of the curve,
which effectively draws the full curve. All four control points should be drawn as circles as well after the curve is
drawn.

`Point2D GetPoint(const std::vector<sf::Vector2f> &pts, float t);`

### Part 2

Implement a function that gets the slope of a cubic Bézier curve for time `t`.

`Point2D GetSlope(const std::vector<sf::Vector2f> &pts, float t);`

Then, in each frame, draw a small square along this curve repeatedly for t in [0, 1]. This square should be oriented to
the curve at each time step. (Tip: start by moving a square, then work on adding rotation.)

### Part 3

Update the drawing code to clearly draw the control handles along the curve. These should be lines from the first to
second point and the third to fourth point.

Implement a mouse handler that, when you left-click, finds the closest point on the Bézier curve and updates its
location to follow the mouse. As you move the mouse, the curve should be updated dynamically. You should keep track of
the current point being manipulated once the mouse is clicked down, and that point should be continuously manipulated
until a mouse up event is received. (Tip: keep an integer with the index in the vector of points that is being edited,
and then manipulate the point in that location when any mouse events occur. When editing stops, reset that integer to
ensure no further editing occurs. That is, if you are moving the third point, keep an integer with the value 3 to
reference which point is currently being edited.)

### Part 4

Extend the editor to handle more points. Hitting `+` on the keyboard should increase the number of points on the curve
(adding three more), while hitting `-` should reduce the number of points. (Removing three points while never reducing
below 4 points.)

Enforce smooth Bézier curves by checking the slope through points on the curve. In particular, the slope between points
3 and 4 (starting from 1) should be the same as the slope between points 4 and 5. When point 3 is moved, point 5 should
be moved to maintain the same slope as between points 3 and 4 without changing the distance from point 4.

### Bonus

Build an editor which can be used to draw and export Bézier curves for your course project.

1. Extend the editor to support multiple Bézier curves.
2. Draw an overlay on the screen which represents the Galaga screen size. (Use a 1:2 ratio so that you can see areas
   both inside and outside the screen area.)
3. Add the ability to export the points on the curves as C++ code which you will be able to use in Project 1b.
