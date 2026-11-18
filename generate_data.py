"""Generate the demo data with real cosine similarities for fictional comments."""

import json
from pathlib import Path

MODEL = "BAAI/bge-base-en-v1.5"
REFERENCE = "Software updates interrupt my work."
EDITABLE = "Priorities change without much explanation."
COMMENTS = {
    "Staffing": [
        ("We're short staffed on Mondays.", "The queue builds up before lunch and we end up asking the next shift to clear work that was due in the morning."),
        ("We need more cover during holidays.", "It is difficult to get a break when two people are away at the same time and nobody is scheduled to cover the desk."),
        ("The team needs another technician.", "At the moment every repair request goes to the same person, which is fine on quiet days but leaves a backlog when equipment breaks."),
        ("Backfilling vacant roles takes too long.", "We had several months where people split the duties from an open role and the extra hours were becoming difficult to sustain."),
        ("Weekend staffing feels about right.", "There are enough people to rotate between the busy and quiet periods, so we can deal with requests as they come in."),
        ("Cross-training would help with staff cover.", "A second person familiar with each station would make it much easier to handle an absence without pulling someone off a different job."),
    ],
    "Tools": [
        ("The reporting tool is slow.", "It often takes several minutes to load a single view, so checking figures during a meeting means asking everyone to wait or looking later."),
        ("We need more reliable laptops.", "Mine freezes when I run ordinary work applications at the same time, even after restarting and following the instructions from technical support."),
        ("The new search feature works well.", "I can get to the current reference material much faster and spend less time checking whether the first result is an old copy."),
        ("Shared printers keep breaking.", "The nearest working printer is on another floor, which becomes a problem when we need several printed copies before a customer appointment."),
        ("Software updates interrupt my work.", "The restart prompts tend to appear halfway through the day when I have documents open and I am trying to finish something."),
        ("Our licenses should cover more people.", "Several teammates need the design software for occasional edits and have to wait for a colleague with access to be free."),
    ],
    "Pay": [
        ("The pay bands are unclear.", "I know the range listed for my role but I do not understand how people move through it or when that conversation takes place."),
        ("The overtime rate seems fair.", "It is explained clearly on the payslip and the amount I receive each month has matched the hours I recorded on the system."),
        ("Salary reviews feel inconsistent.", "Some teams hear about their adjustments earlier than others and it is hard to tell whether everyone was assessed against the same criteria."),
        ("Travel reimbursements take too long.", "The money can be outstanding for weeks after I have paid for a trip, which is inconvenient when several journeys fall in the same month."),
        ("Pay hasn't kept up with inflation.", "My salary increase was small this year and the difference is noticeable when I compare what I spend on rent and groceries."),
        ("The bonus rules are confusing.", "I would like a clear explanation of what goes into the calculation and an example showing how different performance ratings change the amount."),
    ],
    "Development": [
        ("I want more practical training.", "The online modules explain the principles but I learn more when I can work through a realistic task with somebody who knows the job."),
        ("Promotion criteria should be clearer.", "It would help to know what experience I need for the next level and how my manager will evaluate whether I have it."),
        ("The mentoring sessions are useful.", "Having someone outside my team to ask about career questions makes it easier to think through which skills to work on next."),
        ("Training time rarely gets protected.", "I book time for a course and then move it several times because a regular meeting or something urgent comes up that afternoon."),
        ("Internal vacancies could be advertised better.", "I sometimes hear that a role was open after interviews have started, which makes it difficult to explore opportunities in other teams."),
        ("Onboarding needs more hands-on practice.", "During my first week I watched somebody demonstrate the work, but it would have helped to try it myself before taking on a full workload."),
    ],
    "Communication": [
        ("Priorities change without much explanation.", "We get a new list of tasks and sometimes it is hard to work out which existing commitments should be put on hold."),
        ("Team updates are timely.", "Our manager shares decisions soon after they are made and usually gives everyone a chance to ask about anything that will affect their work."),
        ("Announcements are spread across too many channels.", "Some updates arrive by email and others are posted in chat, so I find myself looking in several places to get the whole story."),
        ("Leadership meetings need more questions.", "There is a lot of time for presentations and only a few minutes left for staff to ask about proposed changes."),
        ("Handover notes are usually clear.", "When I take over a piece of work I can tell what has already happened and what decisions need to be made next."),
        ("We hear about changes late.", "I sometimes find out about a decision once a new process is already in place, which leaves little time to plan around it."),
    ],
    "Scheduling": [
        ("Shift schedules arrive too late.", "Knowing the dates earlier would make it easier to arrange childcare and appointments without asking colleagues to swap with me at short notice."),
        ("Flexible start times help a lot.", "I can arrive earlier on some days and later on others, which makes the commute and my family responsibilities easier to manage."),
        ("Shift swaps take too much paperwork.", "Two colleagues can agree to an exchange quickly, but it takes extra time to fill in the forms and get the change confirmed."),
        ("Too many meetings run over.", "When one meeting finishes late I miss the start of the next one or have to catch up on the discussion afterward."),
        ("The weekend rotation seems fair.", "Everybody can see when their turn is coming and the schedule gives us enough time to make plans around the days we are working."),
        ("Break times should be more flexible.", "Some of us would prefer to take a break at a slightly different time when the workload allows and there is cover available."),
    ],
    "Processes": [
        ("Purchase approvals have too many steps.", "Even a routine order passes through several people, and if one of them is on leave it can sit for quite a while."),
        ("The new request form is easier.", "It asks for the information we actually need and I spend less time copying details from one screen into another when creating a request."),
        ("We enter the same data twice.", "Some details already exist in the original record but are required in the separate tracking spreadsheet, where an old copy can cause mistakes."),
        ("Nobody knows who owns escalations.", "A difficult case can go back and forth between departments before somebody takes responsibility, by which time the person waiting has usually chased us."),
        ("The checklists make handoffs smoother.", "The receiving team has the important details in one place, which saves us a few messages each time we pass a file across."),
        ("Expenses should be easier to submit.", "It takes several screens to attach a receipt and choose a category, even for the same regular journey I submitted the previous month."),
    ],
    "Recognition": [
        ("Good work often goes unnoticed.", "People regularly help a colleague or fix a problem quietly, and that effort tends to get less attention than work presented at meetings."),
        ("I appreciate prompt individual feedback.", "A short message explaining what I did well is easier to learn from than hearing general praise a few months after the work."),
        ("Recognition mostly goes to visible teams.", "Colleagues who keep things running in the background do important work too, but they rarely get mentioned at the all staff meeting."),
        ("Peer nominations have worked well.", "They give us a chance to thank people we work with directly and make it easier to recognize small contributions that managers might miss."),
        ("The awards feel too infrequent.", "By the time the annual event comes around, people have forgotten details about who contributed to work at the start of the year."),
        ("Our manager acknowledges extra effort.", "When the team has to handle more than usual, we tend to get specific feedback about what helped rather than a general thank you."),
    ],
}


def build_records():
    records = []
    ids_by_text = {}
    comment_id = 0
    for theme, comments in COMMENTS.items():
        for short, detail in comments:
            comment_id += 1
            ids_by_text[short] = comment_id
            for version, comment in (("short", short), ("expanded", f"{short} {detail}")):
                records.append({
                    "commentId": comment_id,
                    "version": version,
                    "theme": theme,
                    "text": comment,
                })
    example = {"referenceId": ids_by_text[REFERENCE], "editableId": ids_by_text[EDITABLE]}
    return records, example


def main():
    from sentence_transformers import SentenceTransformer

    records, example = build_records()
    model = SentenceTransformer(MODEL, device="cpu", model_kwargs={"use_safetensors": True})
    vectors = model.encode(
        [record["text"] for record in records],
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    pairwise = vectors @ vectors.T
    # The upper triangle holds each unordered pair once. The diagonal is excluded.
    similarities = [
        [round(float(value), 7) for value in pairwise[i, i + 1:]]
        for i in range(len(records))
    ]
    output = {"model": MODEL, "example": example, "comments": records, "similarities": similarities}
    path = Path(__file__).with_name("demo-data.json")
    path.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} comments and {sum(map(len, similarities))} pairwise scores to {path.name}")


if __name__ == "__main__":
    main()
