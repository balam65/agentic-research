

## Speaker 1 (00:01)
Who wrote an article? Not the long ago about changing, he's famous for getting rid of the 40%,
the 4000 people. Yes later.

## Speaker 2 (00:11)
Yeah, read that.

## Speaker 1 (00:11)
IPS, so there wasn't big news. Where but he explains why he explains, and he actually shows
people how he has rebuilt the organization to use agents. Okay, so with agents when you When
you're coming up with agentic architecture, the big thing to understand is you have to redesign
the process from the ground up to use agents.

## Speaker 1 (00:45)
But that doesn't mean that a you replace people completely. That doesn't mean that you have to
put an agent everywhere, and the number one mistake I see every team doing is exactly that
they all basically take whatever function that was done, the way it was done. And they just swap
it out with an agent, and now they're calling it dead agent, and that's their take on a jet that's not
right at all.

## Speaker 1 (01:13)
That's basically just replacing if-then-else harcoded with an LLM, which you're not necessarily
making it any better. You know, you're not making it faster, you're not making it less expensive,
and the big thing is, everybody is missing. The But for the most part, not necessarily the
memory, but the self-improvement loop and the human in the loop, like without those two things,
you're not building anything augentic, you're just, you're still doing warflow, automation.

## Speaker 2 (01:43)
Yeah, it's automation.

## Speaker 1 (01:44)
I'm considering aging for yeah, that's not that's not where the value is at. Okay so this article,
when you go through it, it gives you his take his understanding of agentic and how he changed
his entire business. Ok, to use agents so agents work alongside of human beings.

## Speaker 1 (02:09)
Okay And it's very important to kind of go through that because the background that I think
everybody should understand the next link is I did. I took that article, and I asked graph to
simply summarize it. So that it's easy to digest so that like it was easy for Justin.

## Speaker 1 (02:29)
Or it was easy for John to read and comprehend. Okay, but take a look at that too, because
that's the summary of that article. It's just that this one basically resurfaces, you know, the high
level overview.


## Speaker 1 (02:43)
So the big takeaway I want you to think about is this capabilities, world model shared data that
both agents and human beings can access intelligence layer. That's the agent's assembling
capabilities in real-time. Based on the world model to build whatever, so I believe everybody
right now is doing it the wrong way, okay.

## Speaker 1 (03:09)
It's just based on this. Okay, and then interfaces are surfaces. So this is like the stuff you were
building, for example, so just as an example, like this is the current state of the command
center, right?

## Speaker 1 (03:25)
So I added a few extra things that are aligned with the articles. I'm sharing with you to give you
context. So there's the world model, which is basically a common surface area for this is the
common data that goes through the system.

## Speaker 1 (03:45)
All sorts of things events, kpis, recommendations, agent actions basically all data collected by
the system. Is here okay and then? Agents, agents can use this data as input to make
recommendations to make changes to execute the same way.

## Speaker 1 (04:07)
You as a human being, would assume, all this data to then make a decision, take an action,
recommend a strategy and so on. So this is just the common

## Speaker 2 (04:17)
You know, kind of situational awareness, kind of thing for the Providing situational awareness to
the

## Speaker 1 (04:26)
Well, yes, for agents and humans alike both both the trick. The trick that Jack is advocating is
that your agents have to have access to the same data you have access to? In order to be
useful, so both parties, human and agents need to be on the same playing field with the access
to the data.

## Speaker 1 (04:50)
And then I have some shared capabilities that list is going to grow longer and longer right now.
I'm just focused on the sales, so I have reflection. The things that I'm sharing with you.

## Speaker 1 (05:00)
I have reflections of that already in the agentical S. So if you're building something and this is
the latest version checked in on the main Brack Panch. If you're building something you want to
reflect some of it, that's why I'm sharing with you.


## Speaker 1 (05:16)
So you can start thinking about what that means with whatever you're building, but what I would
envision is not a bunch of agents, I would envision a bunch of capabilities that in some cases
are the code that you have today some cases, it's agents some cases. It's a combination of
things, even including a human being. But it's a capability like scraping or getting over
authentication or enriching or classification, or some predictive analysis, or whatever.

## Speaker 1 (05:48)
So these are capabilities, and then you have the world model, which is basically all data from all
things. It's almost like a data lake. But the data is consumable in a uniform fashion, and then the
agents and humans can tap into it, to assemble a bunch of capabilities to create the workflow
creates some sort of process that facilitates execution of something whatever that is.

## Speaker 1 (06:20)
So. And the agents can do that assembly just in time, so they can cherry, pick which capability
to put together for this particular Yeah, and these agents here the strategy Like the strategy and
the tactics, the agents that I have here will actually put together a different strategy, different set
of tactics. Based on the world, data and the capabilities available.

## Speaker 1 (06:53)
So this is already reflective of it. And by the way, that's not that different from the last time you
touched this, it's just I wasn't emphasizing it, right, because I go through my evolution as well
with this stuff. But this is now very close to what's like I was sharing like this week.

## Speaker 1 (07:13)
I'm trying to push this through to basically get it ready for launch. So this is very close to where it
needs to be the other thing I wanted to show you in the next link. The next link is basically
some.

## Speaker 1 (07:29)
Let me switch over to the other one. There is a business out there. Does some guy that rode
this?

## Speaker 1 (07:37)
But I thought it did a good job. You basically wrote. I hang it.

## Speaker 1 (08:08)
Okay, I must have tasted something wrong.

## Speaker 1 (08:27)
Oh, I pasted it wrong. Sorry, my bet so Yeah, so this is his implementation. No wait, sorry, that's
the wrong article.


## Speaker 1 (08:43)
C*** answered ah. What is that guy? Oh, this right here.

## Speaker 1 (08:58)
Sorry. Dang, it. Yeah, he writes.

## Speaker 1 (09:05)
But anyway. So this is Okay. Sorry.

## Speaker 1 (09:13)
This one I just want to make sure that we're okay. So this link, okay, this link is his take on
practical implementation and so he'll walk you through like his experience with the stuff and
where the gaps are okay where the agents were racing and some other stuff. Okay, so this is a
really good example of an implementation of exactly what I was sharing with you.

## Speaker 1 (09:38)
Okay? And then finally, so, if you were to Refined your approach in the context of this
organization of agents, you know, instead focus on capabilities, world model intelligence layer
and then surface area, like the dashboards, reports command center taping, then you're aligning
it naturally to make it easy for agents to later reassemble different capabilities to make it like
intuitive and adjust on the fly, and basically, if you do it correctly, we should have the entire
company where you have small teams focused on capabilities.

## Speaker 1 (10:23)
We have lots of player coaches. You're a player-coach. I'm a player-coach, right?

## Speaker 1 (10:27)
We do things, but we also coach other people. And then we combine capabilities to build
something new agents also combine capabilities to build something new, but all of us,
collectively use the world data. Use the same pool of information we have access to that powers
all that stuff.

## Speaker 1 (10:49)
Okay? And then, the surface areas are just like infinite pool of dashboards command centers.
You can build whatever you want on.

## Speaker 1 (10:57)
The fly anytime doesn't matter, because what you're reporting is the same world, data or doing
something with the capabilities, right? So like you're being very consistent and the net effect of
that is that everybody should be moving in much faster, there is no paralysis and it's just moving
fast, rapidly, building things do a lot more, you know, with the same group of people if not but
like not an order of magnetic, like this is a way to go to a 100X. Because it's a factory, remember
how I talked about agentic factories and okay?


## Speaker 1 (11:34)
This is a factory that's what this is doing. This is it's labeled differently. But this is basically a
factory where both human beings and agents work side by side.

## Speaker 2 (11:46)
Of the same yeah, and the work of the same awareness of the world around. I mean, yes.

## Speaker 1 (11:52)
So this mandatory, because yes Yeah, because otherwise you're making bad decisions. If you
don't have access to

## Speaker 2 (12:00)
## So

## Speaker 1 (12:01)
So the last thing is, and this one I already shared with. You is my kernel, you know, I keep
updating this, so I added a whole bunch of skills to it. You want to pull that down again, including
in your project.

## Speaker 1 (12:14)
And then ask the agent kernel hall to give you a review of your product. Okay? And And
basically, it's Like review package, Billy, a review package?

## Speaker 1 (12:34)
And so I added the whole thing here for a bunch of different teams where basically what it's
going to do is gonna look at your system from a variety of perspectives. And the output the
output is going to be, it will basically apply a number of like perspectives. And then the output is
going to be a number of artifacts implementation plan evaluation, like it's an entire artifact
bundle.

## Speaker 1 (13:03)
It will create like a bunch of documents that basically give you that review. So when you're
seeking my input, this is a way to get that yourself just by running it without having to wait for
me, you know, but remember this is the this is basically like my pipe is that you have your own
version, I have my own and everybody has, you know, a version of like this digital twin, okay,
right. That they use alongside of inside of this giant factory that we call aggregate intelligence,
whatever it is anyway, that's a side item, but I want you to be aware, because I've updated it and
this has produced a number of artifacts for a number of themes, you know, and I can tell that
some of it.

## Speaker 1 (13:49)
Goes over people's head but you have a different understanding already. So I think to you, this
would make more sense


## Speaker 2 (13:56)
Ellen's for basically KY, doesn't mean from me. Yeah. Yeah.

## Speaker 1 (14:01)
Anyway, so that's the that's the context. The biggest thing is the capabilities world model, you
know, the intelligence layer and the surface area for the dashboards. Because that basically, if
we follow that blueprint, we are applying a factory model that works for the Biggest Silicon Valley
players doing this right now, so we 're not inventing anything.

## Speaker 2 (14:29)
You're not, it's Travis?

## Speaker 1 (14:31)
Just following yeah, and I would rather follow Jack's. You know, Jack, if or like whether I agree
with him or not in certain things doesn't matter but he has a really, you know, he's definitely like
an Elon Musk type figure that knows his stuff for how to organize and create a business entity,
no doubt because he's created them all right. So and he's got multiples, and they're following
that thing.

## Speaker 1 (14:57)
So like You know, I don't have to innovate. All I have to do is follow suit and if we do this
correctly, that alone is the winning play that sets us up ahead of Everybody else because we
can MOVE quickly. The other places cannot

## Speaker 2 (15:14)
Yeah, exactly. I mean, we can skip a lot of those the trial-and-error path that we would otherwise
be going through.

## Speaker 1 (15:23)
So yeah, which, again good learning lessons but, you know, I don't believe everybody's doing it
correctly. I think everybody has a some sort of version of it. And none of it is a 100%

## Speaker 2 (15:38)
Yeah, I agree that what you're basically saying you have the worldview, and you also have a
mechanism that has its own administrative learning process built into it, so that it evolves rather
than remains static, which is what happens if you have an automation, it probably remains fairly
static. Can you do it? I mean, you need

## Speaker 1 (15:59)
Exactly. You supposed to be working on capabilities, enhancing capabilities, and then the
agents will put together the capabilities as needed. So that will automatically evolve the
solutions.

## Speaker 1 (16:12)

It's like you have a version of it that was good for yesterday. New capability against developed
by a team that overcomes some sort of limitation. And now that is available to the agents to then
throw into the mix and start using it right away.

## Speaker 1 (16:28)
So or human beings, if human beings are doing it right either way

## Speaker 2 (16:34)
The end above one of the keys to that would be to have this capabilities very generic. I mean,
don't make them specific, have them. Do not constrain anything to a specific situation.

## Speaker 1 (16:47)
And it's okay to have a 1000 capabilities. By the way, it's okay, it's capabilities are like skills. You
can have as many as you like.

## Speaker 2 (16:55)
You just need to pick the right one I mean, have the ability to get the right agent will have to
have the Yeah, I mean, it has to have that awareness to pick the one according to a situation
rather than

## Speaker 1 (17:11)
All right, Craig, you'll have the complex. You'll have access to the information and then you'll
decide basically which capability to assemble. So that is baked into that process, and you can
think of it like same thing as like the like this file here.

## Speaker 1 (17:27)
So the awareness comes from the context injected into the agents, so you can see it in my
repose. You can see it in a gentic is basically like this file right? That's designed for agents to
understand what's in it.

## Speaker 1 (17:43)
Right? So this is this is already there to help the agents decide what to do. And that's the same
is true in the agentico as files, but this is in my I'm just showing you mine because it's up here,
but the idea is that there are Context files that are picked up by agents.

## Speaker 1 (18:03)
No matter what it is, whether it's Claude, whether it's Gemini, whether it's OpenAI, you know,
whatever they'll look at it, and then they're gonna understand what's available to them. So the
capabilities, if we have a 100, you would have something like this that, you know, just
documents it all and the agents can quickly decide. I'll leave at that.

## Speaker 1 (18:29)
Hopefully that kind of makes sense. But I would say you want to get familiar with the concept,
reflect some of it in your thinking in your design and then maybe evaluate it using my agent

kernel to, like just get some perspective. And then if you want to review it together, I'll make
myself available.

## Speaker 2 (18:48)
Yeah, sure. I'll use the work on this tomorrow and yeah, maybe I'll get back to you. I understand
you wouldn't be available next week.

## Speaker 2 (18:54)
But before that, I'll try to get this

## Speaker 1 (18:57)
Yeah, yeah. I got a vacation starting on Tuesday but I'm around. You know, I'll make time
because these are helpful conversations if I can somehow help you in some way and then you'll
take it from there.

## Speaker 1 (19:10)
I have no doubt so just pay me. Let me know. And I'll make time

## Speaker 2 (19:15)
Thank you. This is useful. I'll

## Speaker 1 (19:18)
I also get to this very good. I have an awesome day. Thank you, bye. Sia.
