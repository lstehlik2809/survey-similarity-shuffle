export function compareMatches({ comments, similarities, example }) {
  const { referenceId, editableId } = example;
  const referenceIndex = comments.findIndex(comment =>
    comment.commentId === referenceId && comment.version === "short"
  );

  function rankMatches(editableVersion) {
    return comments.flatMap((comment, index) => {
      const version = comment.commentId === editableId ? editableVersion : "short";
      if (comment.commentId === referenceId || comment.version !== version) return [];

      const first = Math.min(index, referenceIndex);
      const second = Math.max(index, referenceIndex);
      return [{ ...comment, score: similarities[first][second - first - 1] }];
    }).sort((a, b) => b.score - a.score);
  }

  return {
    reference: comments[referenceIndex],
    editableId,
    results: {
      short: rankMatches("short"),
      expanded: rankMatches("expanded"),
    },
  };
}
