const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const auth = require("../../middleware/auth");
const Posts = require("../../models/Posts");
const Post = require("../../models/Posts");
const Profile = require("../../models/Profile");
const User = require("../../models/Users");

// @route       POST api/post
// @desc        Create a post
// @access      Private
router.post(
  "/",
  [auth, [check("text", "Text is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });
      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route       GET api/post
// @desc        Get all post
// @access      Private

router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route       GET a api/posts/:id
// @desc        Get single post
// @access      Private

router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route       DELETE a api/posts/:id
// @desc        delete a post
// @access      Private

router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    //check user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorised" });
    }

    await post.remove();

    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route       PUT api/posts/like/:id
// @desc        like a post
// @access      Private

router.put("/like/:id", auth, async (req, res) => {
  try {
    const post = await Posts.findById(req.params.id);

    //check post already been liked
    if (
      post.likes.filter((like) => req.user.id === like.user.toString()).length >
      0
    ) {
      return res.status(400).json({ msg: "Post already liked" });
    }

    post.likes.unshift({ user: req.user.id });
    await post.save();
    res.send(post.likes);
  } catch (err) {
    console.error(err.message);

    res.status(500).send("Server Error");
  }
});

// @route       PUT api/posts/like/:id
// @desc        unlike a post
// @access      Private

router.put("/unlike/:id", auth, async (req, res) => {
  try {
    const post = await Posts.findById(req.params.id);

    //check post already been liked
    if (
      post.likes.filter((like) => req.user.id === like.user.toString())
        .length === 0
    ) {
      return res.status(400).json({ msg: "Post has not yet been liked" });
    }

    //get reomve index
    const removeIndex = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);
    post.likes.splice(removeIndex, 1);

    await post.save();
    res.send(post.likes);
  } catch (err) {
    console.error(err.message);

    res.status(500).send("Server Error");
  }
});

// @route       POST api/post/comment/:id
// @desc        Post a comment
// @access      Private
router.post(
  "/comment/:id",
  [auth, [check("text", "Text is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };
      post.comments.unshift(newComment);

      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route       POST api/post/comment/:id/:comment_id
// @desc        Delete a comment
// @access      Private
router.delete("/comment/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //pull out comment
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    if (!comment) {
      res.status(404).json({ msg: "Comment is not exists" });
    }

    //check user
    if (comment.user.toString() !== req.user.id) {
      res.status(401).json({ msg: "User not authorised" });
    }

    //get reomve index
    const removeIndex = post.comments
      .map((comment) => comment.user.toString())
      .indexOf(req.user.id);
    post.comments.splice(removeIndex, 1);

    await post.save();
    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
