# Lab 9 Exercise Problems

Authors: Daniel Zhang, Jake Tuero

> [!WARNING]
> Due: October 27th 2026, 11:30pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-9-exercise"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Problems

1.  In `camera.h`, implement the new methods:

    ```cpp
    sf::Vector2f windowToWorldDist(const sf::Vector2f& vWindow);
    sf::Vector2f worldToWindowDist(const sf::Vector2f& vWorld);

    sf::Vector2f windowPercentToWorldDist(const sf::Vector2f& vWindowPercent);
    sf::Vector2f worldToWindowPercentDist(const sf::Vector2f& vWorld);

    float windowToWorldDist(float vWindow);
    float worldToWindowDist(float vWorld);
    ```

    which are the same as their non-`Dist` versions, except these transforms apply to vectors, not points
    (i.e., they are just distance conversions — you should avoid the constant offset of the window
    center/corner).

2.  In `dynamic_camera.h`, implement

    ```cpp
    void DynamicCamera::update(Camera& camera, const sf::Vector2f& trackedPosWorld, const sf::Vector2f& trackedVelocityWorld)
    ```

    which updates the `Camera`'s center such that given a player object at `trackedPosWorld`, and a player
    velocity of `trackedVelocityWorld`, the camera now not only does dead/soft rejection/hard rejection zones,
    but also lookahead. You need only implement this in the x-axis. You may assume the world coordinates axes
    are of the same orientation of the window coordinates axes.

    Lookahead for this lab means, if the player is currently moving right, then the camera shifts further
    right (to show what's ahead better) up to some parameterized distance. Once the player stops moving, the
    camera shifts back to behave as it did in the prep. If the player moves left, the camera then analogously
    shifts further left. This should be done smoothly via an exponential moving average on `lookaheadState`.
    The distance to lookahead, given as a percentage of the window width, is found in `lookAhead`.

    To perform lookahead, you cannot just use the old camera center as you did for the version without
    lookahead. Our code assumes you will convert distances to world coords and work there (so that updating
    the camera center with a world point is trivial). If you have an alternative preference, you may do so at
    your own risk, so long as you achieve the same functionality.

    Visual samples of lookahead can be found in the video in the prep.

    A high-level outline of what to do is provided in the comments.

    You do not need to modify the provided `main.cpp`, but you may do so for testing different parameters on
    your `DynamicCamera`.
