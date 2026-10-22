# Lab 9 Prep Problems

Authors: Daniel Zhang, Jake Tuero

> [!WARNING]
> Due: October 27th 2026, 2:00pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-9-prep"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Cameras

Watch the following video:

<iframe
  src="https://www.youtube-nocookie.com/embed/TdWFzpgnljs"
  title="Camera design tutorial"
  width="560"
  height="315"
  style="width: 100%; max-width: 560px; aspect-ratio: 16 / 9; height: auto; border: 0;"
  loading="lazy"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
/>

## Tweening

In general, there are many ways to “ease” along a parameterized curve from one of its endpoints to another.
One way is via the *exponential moving average* (EMA), which, given a *smoothing factor* $0 < \alpha < 1$ and
samples $x_0, x_1, \dots$, is given by:

$$
\begin{align*}
                s_0 &=  x_0 \\
                s_n &= \alpha x_n + (1-\alpha) s_{n-1} && \text{for } n > 0 \end{align*}
$$

(note some texts may swap the factors $\alpha$ and $(1 - \alpha)$). If $\alpha$ is small, the
average focuses on the accumulated historical samples and moves “slowly” towards the new samples. If
$\alpha$ is large, the average moves towards new samples, quickly discarding the effects of old
samples. In any case, the expected value of $s_n$, assuming the samples $x_n$ are
independently and identically distributed, is the expected value of $x_n$.

A convenient property of the exponentially moving average is that no extra state needs to be maintained to
compute it iteratively (hint: at each frame) besides the old value of the average. If your $x_n$ are
asymptotically constant, the average converges towards that stationary value.

*Hint:* The EMA can be rewritten:

$$
s_n = s_{n-1} + \alpha(x_n - s_{n-1})
$$

## Problems

1.  *Coordinate system conversions*: Suppose we are in a setting in which we have the following:

    ```cpp
    class Camera {
    public:
        // ...
    private:
        sf::Vector2f mWindowSize; // size of the window in screen pixels (i.e. window coords)
        sf::Vector2f mViewCenterWorld; // world coords point corresponding to the center of our window.
        float mWorldUnitsPerPixel; // distance in world coords covered by one pixel
    };
    ```

    A completely general implementation mapping a world-coordinates axis-aligned rectangle to the
    screen-coordinates axis-aligned rectangle would support different aspect ratios between the two (i.e., a
    `worldUnitsPerPixel` for the x-axis, and another for the y-axis). However, keeping this lab simple we will
    assume our world and screen rectangles will share the same aspect ratio.

    Implement the following methods in `camera.h`. You may assume SFML's window-coordinate system (origin at
    the top-left, units in screen pixels), **and that the world coordinates axes are of the same
    orientation**. For all of them, it is not required/guaranteed that a given point is *inside* the viewable
    rectangle into the world.

    1.  ```cpp
        sf::Vector2f windowToWorld(const sf::Vector2f& pWindow);
        ```

        which converts a point in window coordinates to a point in world coordinates.

    2.  ```cpp
        sf::Vector2f worldToWindow(const sf::Vector2f& pWorld);
        ```

        which converts a point in world coordinates to a point in window coordinates.

    3.  ```cpp
        sf::Vector2f windowPercentToWorld(const sf::Vector2f& pWindowPercent);
        ```

        which converts a point in **normalized** window coordinates (i.e., expressed as percentages of the
        window size) to a point in world coordinates.

    4.  ```cpp
        sf::Vector2f worldToWindowPercent(const sf::Vector2f& pWorld);
        ```

        which converts a point in world coordinates to **normalized** window coordinates.

    5.  ```cpp
        void translateWorld(const sf::Vector2f& deltaWorld);
        ```

        which translates the camera by `deltaWorld` world units.

    6.  ```cpp
        void translateWindow(const sf::Vector2f& deltaScreen);
        ```

        which translates the camera by `deltaScreen` window units.

    7.  ```cpp
        void translateWindowPercent(const sf::Vector2f& deltaScreenPercent);
        ```

        which translates the camera by `deltaScreenPercent` **normalized** window units.

    8.  ```cpp
        void setCamera(const sf::Vector2f& pWorld, const sf::Vector2f& pWindow);
        ```

        which, given a point in world coordinates and a point in window coordinates, maintains the camera's
        scale and translates the camera such that the given screen point now maps to the given world point.

    9.  ```cpp
        void setCameraPercent(const sf::Vector2f& pWorld, const sf::Vector2f& pWindowPercent);
        ```

        A convenience method which does the same as the previous method, but instead takes a screen point
        given as a percentage of the total window size from the top-left (instead of a pixel distance from the
        top-left).

    10. ```cpp
        void setCameraCenter(const sf::Vector2f& pWorld);
        ```

        An even more convenient method, which sets the camera such that the center of the window-coordinates
        rectangle maps to the given world point.

    11. ```cpp
        sf::Vector2f getCameraCenter() const;
        ```

        which just returns the current camera view center in world coordinates.

    You might find it useful for your own use to write some of the above conversion methods for
    one-dimensional floats too. You may do this on your own time.

2.  Complete the TODO in `main.cpp`.

    <ImageCard
      id="fig-prep"
      image="/static/img/lab9_prep.png"
      title="Figure 1"
      width="100%"
      :center="true"
    />

    After moving to the right and then letting go of 'D', the camera eventually settles so that the player is
    on the right green line

    We provide you starter code that tracks the player along the x-axis (given that you've completed 1j. and
    1k.; both of which are trivial). Remove the current camera tracking and instead write code which detects
    whether the player's **center** currently appears in the dead zone (between the green bars), in the soft
    exclusion zones (between the consecutive green and red bars), or in the hard exclusion zones (beyond the
    red bars). All of these zones are relative to the window, **not the world**.

    - If the player is in the dead zone, the camera does not need to move.
    - If the player is in either soft exclusion zone, figure out the distance of the player from the nearest
      green line and gently push them in that direction with an exponential moving average. Use
      `SOFT_CAMERA_ALPHA` for the $\alpha$ value. This creates a damping effect.
    - If the player is in the hard exclusion zones, the camera should hard-adjust so that the player's center
      is always kept at most *at* the red lines. This means that the player center must never pass the red
      lines.
