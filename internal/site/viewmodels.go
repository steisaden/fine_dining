package site

type NavItem struct {
	Label, URL string
	Current    bool
}

type PageData struct {
	Title, Description, Page, ContentTemplate string
	Nav                                       []NavItem
	Courses                                   []Course
	Services                                  []Service
	SelectedCourse                            Course
	SelectedService                           Service
	Form                                      ReservationForm
	Errors                                    map[string]string
	ErrorSummary                              []string
	Success                                   bool
	PromptText                                string
}

func courseBySlug(slug string) Course {
	for _, course := range courses {
		if course.Slug == slug {
			return course
		}
	}
	return courses[0]
}

func serviceBySlug(slug string) Service {
	for _, service := range services {
		if service.Slug == slug {
			return service
		}
	}
	return services[0]
}

type Course struct {
	Slug, Number, Name, Ingredients, Marker, Notes string
}

type Service struct {
	Slug, Name, Summary, Detail string
}

var courses = []Course{
	{"first", "I", "Cold pea · lovage", "garden pea, cultured cream, lovage oil", "V", "Peas are served in three textures with a cool cultured broth; lovage is added at the pass."},
	{"second", "II", "River trout · sorrel", "trout, sorrel, smoked roe", "GF", "The trout is gently cooked, rested, then finished with sorrel and a restrained smoked-roe sauce."},
	{"third", "III", "Celeriac · brown butter", "celeriac, hazelnut, preserved lemon", "V", "Celeriac is roasted whole, glazed in brown butter, and cut with preserved lemon at service."},
	{"fourth", "IV", "Duck · blackcurrant", "duck, bitter leaves, blackcurrant", "GF", "Duck is served with the bitterness and acidity adjusted to the season’s leaves and fruit."},
	{"fifth", "V", "Pear · hay", "pear, toasted hay, oat", "VG", "Pear is poached and paired with a toasted-hay infusion and crisp oat. A plant-based version is available with notice."},
}

var services = []Service{
	{"intimate-dinners", "Intimate dinners", "A composed tasting menu served in your home or chosen setting.", "We plan the menu around season, place, kitchen, pace, and the needs of every guest. Service is designed for a small table and a calm evening."},
	{"chef-table", "Chef’s-table evenings", "A closer view of the decisions made at the pass.", "Courses are finished within view where the setting allows. The evening leaves room for conversation about ingredients and technique without turning dinner into a demonstration."},
	{"celebrations", "Small celebrations", "Occasions shaped around the people at the table.", "The menu, sequence, and service notes respond to the occasion. We keep the room attentive rather than theatrical and confirm every practical detail in advance."},
	{"collaborations", "Collaborations & residencies", "Short-form menus developed with a host, place, or creative partner.", "Each collaboration begins with a shared premise and a realistic reading of the site. Scope, responsibilities, access, and service format are agreed before menu development begins."},
}
