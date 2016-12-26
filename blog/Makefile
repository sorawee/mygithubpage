posts-sourcefiles := $(wildcard blog/*.poly.pm)
posts-sourcelistings := $(patsubst %.poly.pm,%.pollen.html,$(posts-sourcefiles))

all:
	raco pollen render index.ptree; \
	raco pollen render styles.css; \
	raco pollen publish . ../mygithubpage/blog

$(posts-sourcelistings): util/make-html-source.sh
$(posts-sourcelistings): %.pollen.html: %.poly.pm
	util/make-html-source.sh $< > $@
