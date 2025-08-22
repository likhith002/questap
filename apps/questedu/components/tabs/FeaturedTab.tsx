import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { useClientSideFilteredCourses } from "../../hooks/useClientSideFilteredCourses";
import { getUniqueSubjectsAndYearsFromCourses } from "../../lib/college-data-service";
import { debugUserCourseFiltering } from "../../lib/course-diagnostics";
import { Course } from "../../lib/course-service";
import { Department, getAllDepartments } from "../../lib/department-service";

interface CourseFilterState {
  programId?: string;
  yearOrSemester?: number;
  subjectId?: string;
  departmentId?: string;
}

export default function FeaturedTab() {
  const theme = useTheme();
  const router = useRouter();
  const { userProfile } = useAuth();
  const [courseFilters, setCourseFilters] = useState<CourseFilterState>({});

  // Subject, Year, and Department filter options
  const [availableSubjects, setAvailableSubjects] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableYears, setAvailableYears] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [availableDepartments, setAvailableDepartments] = useState<
    Department[]
  >([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Use client-side filtered courses hook
  const {
    courses,
    loading,
    error,
    refreshCourses,
    hasCollegeAssociation,
    totalCourses,
  } = useClientSideFilteredCourses(courseFilters);

  // Debug logging - run diagnostics when component mounts and user profile is available
  useEffect(() => {
    if (userProfile && __DEV__) {
      console.log("🏠 [FeaturedTab] Running diagnostics for user profile...");
      debugUserCourseFiltering(userProfile)
        .then((results) => {
          console.log(
            "🏠 [FeaturedTab] Diagnostics complete:",
            (results || []).length,
            "matching courses"
          );
        })
        .catch((error) => {
          console.error("🏠 [FeaturedTab] Diagnostics error:", error);
        });
    }
  }, [userProfile]);

  // Load filter options when user has a program
  useEffect(() => {
    if (userProfile?.programId) {
      loadFilterOptions();
    }
    // Always load departments regardless of program
    loadDepartments();
  }, [userProfile?.programId]);

  // Debug logging
  useEffect(() => {
    console.log("🏠 [FeaturedTab] Component state:", {
      courseFilters,
      coursesCount: courses.length,
      totalCourses,
      loading,
      error,
      hasCollegeAssociation,
      availableSubjects: availableSubjects.length,
      availableYears: availableYears.length,
      availableDepartments: availableDepartments.length,
      userProfile: userProfile
        ? {
            programId: userProfile.programId,
            email: userProfile.email,
          }
        : null,
    });
  }, [
    courseFilters,
    courses.length,
    totalCourses,
    loading,
    error,
    hasCollegeAssociation,
    availableSubjects.length,
    availableYears.length,
    availableDepartments.length,
    userProfile,
  ]);

  const loadFilterOptions = async () => {
    if (!userProfile?.programId) return;

    setLoadingFilters(true);
    try {
      console.log(
        "📚 [FeaturedTab] Loading filter options for program:",
        userProfile.programId
      );
      const { subjects, years } = await getUniqueSubjectsAndYearsFromCourses(
        userProfile.programId
      );
      setAvailableSubjects(subjects);

      // Filter years to only show 1 and 2 as specified in the requirements
      const filteredYears = years.filter(
        (year) => year.value === 1 || year.value === 2
      );
      setAvailableYears(filteredYears);

      console.log("✅ [FeaturedTab] Filter options loaded:", {
        subjects: subjects.length,
        years: filteredYears.length,
      });
    } catch (error) {
      console.error("❌ [FeaturedTab] Failed to load filter options:", error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadDepartments = async () => {
    try {
      console.log("🏢 [FeaturedTab] Loading departments...");
      const departments = await getAllDepartments();
      setAvailableDepartments(departments);
      console.log("✅ [FeaturedTab] Departments loaded:", departments.length);
    } catch (error) {
      console.error("❌ [FeaturedTab] Failed to load departments:", error);
    }
  };

  const onRefresh = async () => {
    try {
      console.log("🔄 [FeaturedTab] Refreshing data...");
      await refreshCourses();
      if (userProfile?.programId) {
        await loadFilterOptions();
      }
      await loadDepartments();
    } catch (err) {
      console.error("❌ [FeaturedTab] Failed to refresh:", err);
    }
  };

  // Remove duplicate courses based on ID (with proper typing)
  const uniqueCourses = courses.filter(
    (course: Course, index: number, self: Course[]) =>
      self.findIndex((c: Course) => c.id === course.id) === index
  );

  const handleYearFilter = (year: number) => {
    if (courseFilters.yearOrSemester === year) {
      // Remove year filter if already selected
      setCourseFilters((prev) => ({ ...prev, yearOrSemester: undefined }));
    } else {
      // Apply year filter
      setCourseFilters((prev) => ({ ...prev, yearOrSemester: year }));
    }
  };

  const handleSubjectFilter = (subjectId: string) => {
    if (courseFilters.subjectId === subjectId) {
      // Remove subject filter if already selected
      setCourseFilters((prev) => ({ ...prev, subjectId: undefined }));
    } else {
      // Apply subject filter
      setCourseFilters((prev) => ({ ...prev, subjectId: subjectId }));
    }
  };

  const handleDepartmentFilter = (departmentId: string) => {
    if (courseFilters.departmentId === departmentId) {
      // Remove department filter if already selected
      setCourseFilters((prev) => ({ ...prev, departmentId: undefined }));
    } else {
      // Apply department filter
      setCourseFilters((prev) => ({ ...prev, departmentId: departmentId }));
    }
  };

  const handleClearFilters = () => {
    console.log("🧹 [FeaturedTab] Clearing filters");
    setCourseFilters({});
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (courseFilters.yearOrSemester) count++;
    if (courseFilters.subjectId) count++;
    if (courseFilters.departmentId) count++;
    return count;
  };

  // const handleCourseDetails = (courseId: string) => {
  //   router.push(`/course-details/${courseId}`);
  // };

  const handleContinueCourse = (courseId: string) => {
    // TODO: Navigate to course learning screen
    console.log("Continue course:", courseId);
  };

  const renderCourseItem = ({ item }: { item: Course }) => (
    <Card style={styles.courseCard}>
      <Card.Cover source={{ uri: item.image }} />
      <Card.Content>
        <View style={styles.titleRow}>
          <Text variant="titleMedium" style={styles.courseTitle}>
            {item.title}
          </Text>
          {item.associations &&
            item.associations.length > 0 &&
            item.associations[0].subjectName && (
              <Text style={styles.subjectChip}>
                {item.associations[0].subjectName}
              </Text>
            )}
          {item.language && (
            <Text style={styles.languageChip}>{item.language}</Text>
          )}
        </View>
        <Text variant="bodySmall" style={styles.instructorText}>
          Instructor: {item.instructor}
        </Text>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="outlined"
          onPress={() =>
            item?.id &&
            router.push({
              pathname: "/course-topics-list/[id]",
              params: { id: String(item.id) },
            })
          }
        >
          Topics
        </Button>
        {/* Question Bank Button */}
        <Button
          mode="outlined"
          onPress={() =>
            item?.id &&
            router.push({
              pathname: "/course-questions-list/[id]",
              params: { id: String(item.id) },
            })
          }
        >
          Question Bank
        </Button>
        {/* <Button onPress={() => handleCourseDetails(item.id!)}>Details</Button> */}
      </Card.Actions>
    </Card>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Program-based Filter Section */}
      {hasCollegeAssociation && userProfile?.programId && (
        <View style={styles.filtersContainer}>
          {/* <View style={styles.filterHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Filter by Program Content</Text>
            {getActiveFiltersCount() > 0 && (
              <Button mode="text" onPress={handleClearFilters} compact>
                Clear All ({getActiveFiltersCount()})
              </Button>
            )}
          </View> */}

          {/* Department Filters */}
          {availableDepartments.length > 0 && (
            <View style={styles.filterSection}>
              <Text
                variant="bodyMedium"
                style={[styles.filterLabel, { color: theme.colors.onSurface }]}
              >
                Departments:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsContainer}
              >
                {availableDepartments.map((department) => (
                  <Chip
                    key={department.id}
                    mode={
                      courseFilters.departmentId === department.id
                        ? "flat"
                        : "outlined"
                    }
                    selected={courseFilters.departmentId === department.id}
                    onPress={() => handleDepartmentFilter(department.id)}
                    style={styles.filterChip}
                  >
                    {department.name}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Year/Semester Filters */}
          {availableYears.length > 0 && (
            <View style={styles.filterSection}>
              <Text
                variant="bodyMedium"
                style={[styles.filterLabel, { color: theme.colors.onSurface }]}
              >
                Years:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsContainer}
              >
                {availableYears.map((year) => (
                  <Chip
                    key={year.value}
                    mode={
                      courseFilters.yearOrSemester === year.value
                        ? "flat"
                        : "outlined"
                    }
                    selected={courseFilters.yearOrSemester === year.value}
                    onPress={() => handleYearFilter(year.value)}
                    style={styles.filterChip}
                  >
                    {year.label}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Subject Filters
          {availableSubjects.length > 0 && (
            <View style={styles.filterSection}>
              <Text variant="bodyMedium" style={styles.filterLabel}>Subjects:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsContainer}>
                {availableSubjects.map((subject) => (
                  <Chip
                    key={subject.id}
                    mode={courseFilters.subjectId === subject.id ? 'flat' : 'outlined'}
                    selected={courseFilters.subjectId === subject.id}
                    onPress={() => handleSubjectFilter(subject.id)}
                    style={styles.filterChip}
                  >
                    {subject.name}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )} */}

          {loadingFilters && (
            <Text variant="bodySmall" style={styles.loadingText}>
              Loading filter options...
            </Text>
          )}
        </View>
      )}

      {/* Standalone Department Filter (when no program selected) */}
      {!hasCollegeAssociation && availableDepartments.length > 0 && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text
              variant="bodyMedium"
              style={[styles.filterLabel, { color: theme.colors.onSurface }]}
            >
              Filter by Department:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipsContainer}
            >
              {availableDepartments.map((department) => (
                <Chip
                  key={department.id}
                  mode={
                    courseFilters.departmentId === department.id
                      ? "flat"
                      : "outlined"
                  }
                  selected={courseFilters.departmentId === department.id}
                  onPress={() => handleDepartmentFilter(department.id)}
                  style={styles.filterChip}
                >
                  {department.name}
                </Chip>
              ))}
            </ScrollView>
          </View>

          {/* Basic Year Filters for courses without program association */}
          <View style={styles.filterSection}>
            <Text
              variant="bodyMedium"
              style={[styles.filterLabel, { color: theme.colors.onSurface }]}
            >
              Years:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipsContainer}
            >
              {[1, 2].map((year) => (
                <Chip
                  key={year}
                  mode={
                    courseFilters.yearOrSemester === year ? "flat" : "outlined"
                  }
                  selected={courseFilters.yearOrSemester === year}
                  onPress={() => handleYearFilter(year)}
                  style={styles.filterChip}
                >
                  {year == 1 ? "First" : "Second"} Year
                </Chip>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* No Program Association Warning */}
      {!hasCollegeAssociation && (
        <Card style={styles.warningCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.warningTitle}>
              Complete Your Profile
            </Text>
            <Text variant="bodyMedium" style={styles.warningText}>
              To see courses specific to your program, please complete your
              profile with your program information.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => router.push("/profile-edit" as any)}
            >
              Complete Profile
            </Button>
          </Card.Actions>
        </Card>
      )}

      {/* No Program Selected Warning */}
      {hasCollegeAssociation && !userProfile?.programId && (
        <Card style={styles.warningCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.warningTitle}>
              Select Your Program
            </Text>
            <Text variant="bodyMedium" style={styles.warningText}>
              Please select your program in your profile to see program-specific
              courses and subjects.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => router.push("/profile-edit" as any)}
            >
              Edit Profile
            </Button>
          </Card.Actions>
        </Card>
      )}

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Subjects
        {getActiveFiltersCount() > 0 &&
          ` (${
            uniqueCourses.length
          }/${totalCourses} with ${getActiveFiltersCount()} filter${
            getActiveFiltersCount() > 1 ? "s" : ""
          })`}
        {getActiveFiltersCount() === 0 &&
          totalCourses > 0 &&
          ` (${uniqueCourses.length}/${totalCourses})`}
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text>Loading courses...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <Button onPress={onRefresh}>Retry</Button>
        </View>
      ) : uniqueCourses.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No Subjects Found
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {hasCollegeAssociation && userProfile?.programId
              ? getActiveFiltersCount() > 0
                ? "No courses found with the applied filters. Try adjusting your filter selection."
                : "No courses are available for your program yet. Please check back later or contact your administrator."
              : "Complete your profile to see courses specific to your program."}
          </Text>
          {getActiveFiltersCount() > 0 && (
            <Button
              mode="outlined"
              onPress={handleClearFilters}
              style={{ marginTop: 16 }}
            >
              Clear Filters
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={uniqueCourses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item.id || ""}
          contentContainerStyle={styles.coursesList}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  courseTitle: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#fff",
  },
  subjectChip: {
    backgroundColor: "#1976D2",
    color: "#fff",
    fontWeight: "bold",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    fontSize: 13,
    overflow: "hidden",
  },
  languageChip: {
    backgroundColor: "#43A047",
    color: "#fff",
    fontWeight: "bold",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    fontSize: 13,
    overflow: "hidden",
  },
  instructorText: {
    color: "#666",
    marginBottom: 4,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    marginBottom: 8,
    fontWeight: "600",
  },
  filterChipsContainer: {
    flexDirection: "row",
  },
  filterChip: {
    marginRight: 8,
  },
  loadingText: {
    fontStyle: "italic",
    color: "#999999",
    textAlign: "center",
    marginTop: 8,
  },
  warningCard: {
    marginBottom: 16,
    backgroundColor: "#fff3cd",
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  warningTitle: {
    color: "#856404",
    marginBottom: 4,
  },
  warningText: {
    color: "#856404",
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: "bold",
  },
  coursesList: {
    paddingBottom: 80,
  },
  courseCard: {
    marginBottom: 16,
  },
  courseDetailsContainer: {
    marginVertical: 8,
  },
  courseDetail: {
    marginBottom: 4,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    textAlign: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 16,
    opacity: 0.7,
  },
});
