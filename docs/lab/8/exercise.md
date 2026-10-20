# Lab 8 Exercise Problems

Author: Daniel Zhang

> [!WARNING]
> Due: October 20th 2026, 11:30pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-8-exercise"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Problems

1. *Designing a basic transform (continued)*. Recall our `BasicTransform` from the prep, which only applies
   scale and translation. In this problem, we analyze the structure of the *set of all `BasicTransform`s*.

   As a reminder, a `BasicTransform` in 2D has 4 degrees of freedom, as it is parameterized by 2 vectors:

   ```cpp
   struct BasicTransform {
       sf::Vector2f scale;
       sf::Vector2f translation;
   };
   ```

    1. *Composition*. Given any two `BasicTransform`s $f$ and $g$, suppose we want a
       single `BasicTransform` which is equivalent to applying $g$ first, and then
       $f$.

       Formally, we want $(f \circ g)$ such that

       $$
       (f\circ g)(\mathbf{x}) = f (g (\mathbf{x}))
       $$

       for all points and vectors $\mathbf{x}$.

       Is this **always** possible for any two `BasicTransform`s $f, g$? If so, implement the
       `static` method `compose` which computes this new transform:

       ```cpp
       static BasicTransform BasicTransform::compose(const BasicTransform& f, const BasicTransform& g);
       ```

       Otherwise, leave the implementation blank and in comments, give a concrete example of two
       `BasicTransform`s whose consecutive application cannot be represented as one (and explain why
       not). [+note1]

       [+note1]: More formally, we are asking you to determine whether the space of `BasicTransform`s is *closed under
         composition*.

    2. *Inversion*. Given a `BasicTransform` $f$ **whose `scale` components are all nonzero**,
       can you always find a corresponding `BasicTransform` also with nonzero scale components (call it
       $f^{-1}$) that “undoes” the original transform? In particular, the original $f$
       should also “undo” $f^{-1}$.

       Formally, we want $f^{-1}$ such that

       $$
       f^{-1} (f (\mathbf{x})) = \mathbf{x} = f (f^{-1} (\mathbf{x}))
       $$

       for all points and vectors $\mathbf{x}$.

       If this is possible for all $f$ with nonzero scale components, implement the `static`
       method `inverse` which finds this new transform:

       ```cpp
       static BasicTransform BasicTransform::inverse(const BasicTransform& f);
       ```

       Otherwise, leave the implementation blank and in the comments, give an example of a `BasicTransform`
       with nonzero scale components which cannot be undone by another `BasicTransform` with nonzero scale
       components (and explain why not). [+note2]

        [+note2]: More formally, we are asking you to determine whether the space of `BasicTransform`s with nonzero 
           scale is *closed under inversion*.

2. *Sprite Manager.* Design a class, `SpriteManager`, which centralizes storage of `sf::Texture`s as well as
   of `Sprite`s. It must support:

    - ```cpp
      sf::Texture& registerTexture(const std::string& filepath)
      ```

      which constructs a `sf::Texture` from a filepath in the manager's storage and returns a reference to the
      constructed texture. You may reference `sf::Texture`:
      ([documentation](https://www.sfml-dev.org/documentation/3.0.0/classsf_1_1Texture.html))
      ([tutorial](https://www.sfml-dev.org/tutorials/3.0/graphics/sprite/#loading-a-texture)).

      This operation must be *idempotent*: if you try to register the same filepath twice (or more), you'll
      keep getting back exactly the same reference.

    - ```cpp
      template <typename... Args> SpriteID createSprite(Args&&... args)
      ```

      which perfectly forwards the arguments to construct a `Sprite` (from the prep) **in-place** in the
      manager's storage and returns the slot the sprite occupies as a `SpriteID`. This means that any of
      `Sprite`'s constructor parameter sets are supported.

    - ```cpp
      Sprite& getSprite(SpriteID id)
      ```

      which returns a reference to the sprite stored in a given slot.

   This `SpriteManager` *would* be the perfect place to make use of your `Registry` from Lab 7 (possibly with
   some modifications). However, you may assume for the purpose of this lab (to avoid double-penalties on
   Registry issues) that deletion is not required (for neither sprites nor textures), so you can just do
   append-only logic on simple STL containers.

   *Aside: In a production implementation, we'd probably move out the texture storage into its own
   `TextureManager`, but we'll keep things simple for this lab.*

3. *Written problems.* Answer each of the following **in 1-2 sentences each**.
    1. Consider your `Sprite` implementation from the prep. It is implemented in OOP fashion, and it contains
       all the data fields necessary to store and render a sprite as a whole game object.

       Which data field of your `Sprite` is the best candidate to move out into a separate component type in
       an ECS setup? Choose the one that is most likely to apply to things other than sprites. Briefly
       justify your choice.

       *As an aside, moving out this data field will mean that a `Sprite` no longer contains all the
       information necessary for a draw call. Thus, the sprite rendering system will now be responsible for
       getting all required components before doing the draw logic.*

    2. Recall from our prep material that when textures have transparency (e.g., are partially transparent),
       the alpha blending compositor is responsible for doing the blending logic. Compositing a
       $source$ colour onto $destination$ colour (where both may not be opaque) is given by:

       $$
       output_{RGB} = source_{RGB} \times source_{A} + destination_{RGB} *  (1 - source_{A})
       $$

       $$
       output_{A} = source_{A} + destination_{A} *  (1 - source_{A})
       $$

       This operation is not commutative (you can check that swapping $source$ and $destination$
       leads to different $output$ in general). In other words, the order in which you render sprites
       matters.

       What does this mean we have to do if we want to render multiple, possibly translucent sprites on top
       of eachother (think of windows with different colour tints stacked on top of eachother)?
